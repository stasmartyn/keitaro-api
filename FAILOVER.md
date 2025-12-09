# Failover API - Автоматичне Переналаштування Keitaro

## Огляд

Failover API автоматично переналаштовує Keitaro трекер при бані застосунків, перенаправляючи трафік на живі застосунки без втрат.

## Архітектура

```
Webhook Event → Validation → Failover Service → 4 Steps → Message Broker Alerts
```

## Використання API

### Preview Endpoint (Dry-Run)

**POST** `/api/v1/failover/webhooks/app-banned/preview`

Виконує повний аналіз без внесення змін. Ідеально для:

- Перевірки що буде змінено
- Тестування перед реальним запуском
- Аудиту поточного стану

**Request**:

```json
{
    "platform": "ios",
    "app_id": "6754768826"
}
```

**Response**:

```json
{
    "summary": {
        "appId": "6754768826",
        "platform": "ios",
        "totalOperations": 11
    },
    "step1_campaigns": {
        "found": 3,
        "campaigns": [
            {
                "id": 12345,
                "name": "Applink_iOS_6754768826",
                "currentGroupId": 8,
                "willMoveToGroupId": 9
            }
        ]
    },
    "step2_domains": {
        "found": 5,
        "domains": [
            {
                "id": 501,
                "name": "example.com",
                "currentCampaignId": 12345,
                "currentGroupId": 1,
                "willSetCampaignId": 5,
                "willSetGroupId": 12
            }
        ]
    },
    "step3_offers": {
        "found": 2,
        "offers": [
            {
                "id": 5001,
                "name": "iOS_6754768826_Private",
                "currentGroupId": 7,
                "willMoveToGroupId": 11
            }
        ]
    },
    "step4_stream": {
        "streamId": 35,
        "campaignId": 5,
        "configValid": true,
        "currentOffer": {
            "id": 5001,
            "name": "iOS_6754768826",
            "groupId": 11,
            "isBanned": true
        },
        "willReplaceOffer": true,
        "replacementOffer": {
            "id": 7001,
            "name": "iOS_6754769999",
            "groupId": 10,
            "clicks": 15000,
            "reason": "Best public offer by clicks"
        }
    }
}
```

### Webhook Endpoint

**POST** `/api/v1/failover/webhooks/app-banned`

Приймає повідомлення про бан застосунку:

```json
{
    "platform": "ios",
    "app_id": "6754768826"
}
```

**Response**:

```json
{
    "success": true,
    "message": "App ban event received and processing started"
}
```

### Health Check

**POST** `/api/v1/failover/webhooks/health`

```json
{
    "status": "ok",
    "timestamp": "2024-11-24T10:30:00.000Z"
}
```

## Процес Failover (4 Кроки)

### Крок 1: Переміщення Applink Кампаній до Banned

**Мета**: Знайти всі активні кампанії забаненого застосунку та перемістити їх у групу banned.

**Процес**:

1. Отримання кампаній з пагінацією (`GET /admin_api/v1/campaigns`)
2. Фільтрація за:
    - `group_id === APPLINK_CAMPAIGN_GROUP_ID`
    - Назва містить `app_id`
    - `id >= MIN_CAMPAIGN_ID`
3. Оновлення `group_id` → `APPLINK_BANNED_CAMPAIGN_GROUP_ID`

**Приклад**:

```
Input: app_id = "6754768826"
Found: 3 campaigns [12345, 12346, 12347]
Action: Moved 3 campaigns to banned group
```

### Крок 2: Оновлення Доменів

**Мета**: Змінити дефолтну кампанію для доменів, які використовували забанені кампанії.

**Процес**:

1. Отримання всіх доменів (`GET /admin_api/v1/domains`)
2. Фільтрація доменів, де `default_campaign_id` належить до ID з Кроку 1
3. Оновлення (`PUT /admin_api/v1/domains/{id}`):
    - `default_campaign_id` → `DEFAULT_APPLINK_CAMPAIGN_ID`
    - `domain_group_id` → `APPLINK_BANNED_DOMAIN_GROUP_ID`

**Приклад**:

```
Input: campaign_ids = [12345, 12346, 12347]
Found: 5 domains using these campaigns
Action: Updated to default campaign & banned domain group
```

### Крок 3: Переміщення Оферів до Banned

**Мета**: Перемістити всі офери забаненого застосунку у групу banned.

**Процес**:

1. Отримання всіх оферів (`GET /admin_api/v1/offers`)
2. Фільтрація за:
    - Назва містить `app_id`
    - `group_id IN [APPLINK_PRIVATE_OFFER_GROUP_ID, APPLINK_PUBLIC_OFFER_GROUP_ID]`
3. Оновлення `group_id` → `APPLINK_BANNED_OFFER_GROUP_ID`

**Приклад**:

```
Input: app_id = "6754768826"
Found: 2 offers [5001, 5002]
Action: Moved to banned group
```

### Крок 4: Перевірка та Оновлення Замикаючого Потоку

**Підкрок 4.1: Перевірка Статичних Налаштувань**

1. Отримання потоку (`GET /admin_api/v1/campaigns/{id}/streams`)
2. Валідація конфігурації:
    ```json
    {
      "type": "default",
      "state": "active",
      "action_type": "http",
      "action_payload": "",
      "schema": "landings",
      "landings": [{ "landing_id": STREAM_LANDING_ID }]
    }
    ```
3. Якщо не співпадає → відправка `STREAM_CONFIG_ALERT`

**Підкрок 4.2: Заміна Офера (якщо потрібно)**

1. Перевірка поточного офера в потоці
2. Якщо `group_id === APPLINK_BANNED_OFFER_GROUP_ID`:
    - Генерація репорту за вчора (`POST /admin_api/v1/report/build`)
    - Фільтр: `offer_group_id IN [APPLINK_PRIVATE_OFFER_GROUP_ID, APPLINK_PUBLIC_OFFER_GROUP_ID]`
    - Сортування: за кількістю унікальних кліків (DESC)
    - Вибір найкращого офера (пріоритет: Public → Private)
    - Оновлення потоку (`PUT /admin_api/v1/streams/{id}`)
    - Відправка `OFFER_CHANGED` алерту

**Приклад**:

```
1. Get stream → current offer_id: 5001
2. Check group → 319 (BANNED!)
3. Generate report → best offer: 7001 (15000 clicks)
4. Update stream → offers: [7001]
5. Send alert → banned: 6754768826, new: 6754769999
```

## Keitaro API Endpoints

Failover використовує наступні endpoints Keitaro Admin API:

### Campaigns

- `GET /admin_api/v1/campaigns` - отримання кампаній з пагінацією
- `PUT /admin_api/v1/campaigns/{id}` - оновлення кампанії

### Domains

- `GET /admin_api/v1/domains` - отримання всіх доменів
- `PUT /admin_api/v1/domains/{id}` - оновлення домену

### Offers

- `GET /admin_api/v1/offers` - отримання всіх оферів
- `GET /admin_api/v1/offers/{id}` - отримання деталей офера
- `PUT /admin_api/v1/offers/{id}` - оновлення офера

### Streams

- `GET /admin_api/v1/campaigns/{id}/streams` - отримання потоків кампанії
- `PUT /admin_api/v1/streams/{id}` - оновлення потоку

### Reports

- `POST /admin_api/v1/report/build` - генерація звіту

## Message Broker Alerts

### STREAM_CONFIG_ALERT

Відправляється коли конфігурація потоку не відповідає очікуваним значенням.

```json
{
    "type": "STREAM_CONFIG_ALERT",
    "data": {
        "streamId": 35,
        "campaignId": 5,
        "expectedConfig": {
            /* ... */
        },
        "actualConfig": {
            /* ... */
        },
        "timestamp": "2024-11-24T10:30:00.000Z"
    }
}
```

### OFFER_CHANGED

Відправляється після успішної заміни офера.

```json
{
    "type": "OFFER_CHANGED",
    "data": {
        "bannedAppId": "6754768826",
        "currentAppId": "6754769999",
        "oldOfferId": 5001,
        "newOfferId": 7001,
        "streamId": 35,
        "campaignId": 5,
        "timestamp": "2024-11-24T10:30:00.000Z"
    }
}
```

**Endpoint**: `POST {MESSAGE_BROKER_URL}/messages`

## Конфігурація

Всі ID налаштовуються через змінні середовища в `.env`:

```env
# Campaign Groups
APPLINK_CAMPAIGN_GROUP_ID=8
APPLINK_BANNED_CAMPAIGN_GROUP_ID=9
DEFAULT_APPLINK_CAMPAIGN_ID=5
MIN_CAMPAIGN_ID=0

# Domain Groups
APPLINK_BANNED_DOMAIN_GROUP_ID=12

# Offer Groups
APPLINK_PRIVATE_OFFER_GROUP_ID=7
APPLINK_PUBLIC_OFFER_GROUP_ID=10
APPLINK_BANNED_OFFER_GROUP_ID=11

# Stream Configuration
DEFAULT_STREAM_ID=35
STREAM_LANDING_ID=2

# Pagination
CAMPAIGNS_PAGE_SIZE=100

# Message Broker
MESSAGE_BROKER_URL=http://localhost:3001
```

## Error Handling & Retry

**Retry Механізм**:

- Максимум спроб: 3
- Початкова затримка: 1000ms
- Backoff: Exponential (1s → 2s → 3s)
- Логування кожної спроби

**Exception Handling**:

- Global error handling
- Structured logging
- Graceful degradation

## Приклад Виконання

### Preview Request (Dry-Run):

```bash
curl -X POST http://localhost:5005/api/v1/failover/webhooks/app-banned/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"platform": "ios", "app_id": "6754768826"}'
```

### Preview Response:

```json
{
  "summary": {
    "appId": "6754768826",
    "platform": "ios",
    "totalOperations": 11
  },
  "step1_campaigns": { "found": 3, "campaigns": [...] },
  "step2_domains": { "found": 5, "domains": [...] },
  "step3_offers": { "found": 2, "offers": [...] },
  "step4_stream": {
    "configValid": true,
    "willReplaceOffer": true,
    "replacementOffer": {
      "id": 7001,
      "clicks": 15000,
      "reason": "Best public offer by clicks"
    }
  }
}
```

### Real Request:

```bash
curl -X POST http://localhost:5005/api/v1/failover/webhooks/app-banned \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"platform": "ios", "app_id": "6754768826"}'
```

### Логи:

```
[Log] Received app banned event: ios/6754768826
[Log] Starting failover process for banned app: ios/6754768826
[Log] Step 1: Moving Applink campaigns to banned for app_id: 6754768826
[Log] Moved 3 campaigns to banned group
[Log] Step 2: Updating domains for 3 banned campaigns
[Log] Updated 5 domains
[Log] Step 3: Moving offers to banned for app_id: 6754768826
[Log] Moved 2 offers to banned group
[Log] Step 4: Checking and updating default stream
[Log] Updated stream with new offer 7001 (15000 clicks)
[Log] Successfully completed failover process for app: 6754768826
```

### Результат:

- ✅ 3 кампанії перенесено у banned
- ✅ 5 доменів перенаправлено на дефолтну кампанію
- ✅ 2 офера переміщено у banned групу
- ✅ Потік оновлено з найкращим офером
- ✅ Алерт відправлено в Message Broker

**Час виконання**: ~5-10 секунд

## Мікросервісна Архітектура

```
┌─────────────────────┐
│   External System   │
│  (Sends Ban Event)  │
└──────────┬──────────┘
           │ POST /api/v1/failover/webhooks/app-banned
           ▼
┌─────────────────────┐
│  Keitaro Mgmt API   │
│  (NestJS Service)   │
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌─────────────────┐    ┌──────────────────┐
│  Keitaro API    │    │ Message Broker   │
└─────────────────┘    └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Telegram Bot    │
                       │  Email Service   │
                       │  Slack, etc.     │
                       └──────────────────┘
```

**Переваги**:

- Відсутність прямої залежності від конкретних каналів комунікації
- Можливість додавати нові канали без змін в коді
- Централізований message broker для всіх алертів
- Легке масштабування
