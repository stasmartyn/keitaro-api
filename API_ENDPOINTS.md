# API Endpoints для KeitaroOffer

## Cloaking та Gray Section Endpoints

### 1. Enable/Disable Cloaking

**POST** `/api/offers/cloak/enable`

Дозволяє увімкнути або вимкнути cloaking для offer'а.

**Request:**

```json
{
    "offerId": 12345,
    "enableCloaking": true
}
```

**Response:**

```json
{
    "success": true,
    "message": "Cloaking enabled for offer 12345",
    "data": {
        "id": 12345,
        "name": "Test Offer",
        "cloaking_enabled": true,
        "state": "active"
    }
}
```

### 2. Enable/Disable Gray Section

**POST** `/api/offers/gray-section/enable`

Дозволяє увімкнути або вимкнути gray section для offer'а.

**Request:**

```json
{
    "offerId": 12345,
    "enableGraySection": true
}
```

**Response:**

```json
{
    "success": true,
    "message": "Gray section enabled for offer 12345",
    "data": {
        "id": 12345,
        "name": "Test Offer",
        "gray_section_enabled": true,
        "state": "active"
    }
}
```

## Що роблять ці endpoints

- **Cloaking** - приховує справжній URL offer'а від ботів та конкурентів
- **Gray Section** - дозволяє показувати різний контент різним користувачам

Обидва параметри можна увімкнути/вимкнути для будь-якого існуючого offer'а через його ID.

## Failover Endpoints

### 3. App Banned Preview (Dry-Run)

**POST** `/api/v1/failover/webhooks/app-banned/preview`

Виконує dry-run аналіз без внесення змін. Показує що буде змінено при реальному запуску.

**Request:**

```json
{
    "platform": "ios",
    "app_id": "6754768826"
}
```

**Response:**

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
                "name": "Applink_iOS_6754768826_Campaign",
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
            "name": "iOS_6754768826_Private",
            "groupId": 11,
            "isBanned": true
        },
        "willReplaceOffer": true,
        "replacementOffer": {
            "id": 7001,
            "name": "iOS_6754769999_Public",
            "groupId": 10,
            "clicks": 15000,
            "reason": "Best public offer by clicks"
        }
    }
}
```

### 4. App Banned Webhook

**POST** `/api/v1/failover/webhooks/app-banned`

Приймає повідомлення про бан застосунку та автоматично виконує failover процес.

**Request:**

```json
{
    "platform": "ios",
    "app_id": "6754768826"
}
```

**Response:**

```json
{
    "success": true,
    "message": "App ban event received and processing started"
}
```

### 5. Failover Health Check

**POST** `/api/v1/failover/webhooks/health`

Перевіряє доступність failover сервісу.

**Response:**

```json
{
    "status": "ok",
    "timestamp": "2024-11-24T10:30:00.000Z"
}
```

## Що робить Failover

Failover автоматично переналаштовує Keitaro при бані застосунку:

1. Переміщує кампанії забаненого застосунку в групу "Applink banned"
2. Оновлює домени на дефолтну кампанію Applink
3. Переміщує офери забаненого застосунку в групу "Applink banned"
4. Перевіряє та оновлює замикаючий потік, знаходячи найкращу заміну

Детальніше про процес failover дивіться в [FAILOVER.md](./FAILOVER.md).
