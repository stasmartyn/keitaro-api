# Failover Preview Endpoint - Quick Start

## Огляд

Preview endpoint дозволяє виконати dry-run аналіз failover процесу без внесення будь-яких змін до Keitaro. Це корисно для:
- 🔍 Перевірки що саме буде змінено
- ✅ Тестування перед реальним запуском
- 📊 Аудиту поточного стану системи
- 🛡️ Безпечного аналізу наслідків

## Як Використовувати

### 1. Preview (Dry-Run) - Перегляд без змін

```bash
curl -X POST http://localhost:5005/api/v1/failover/webhooks/app-banned/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "ios",
    "app_id": "6754768826"
  }'
```

**Що відбувається:**
- ✅ Знаходить всі кампанії, домени, офери для заданого app_id
- ✅ Перевіряє конфігурацію потоку
- ✅ Аналізує який офер буде обрано для заміни
- ❌ **НЕ вносить жодних змін**
- 📋 Повертає детальний звіт

### 2. Real Execution - Реальне виконання

Після перевірки preview, якщо все правильно:

```bash
curl -X POST http://localhost:5005/api/v1/failover/webhooks/app-banned \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "platform": "ios",
    "app_id": "6754768826"
  }'
```

**Що відбувається:**
- ✅ Виконує всі 4 кроки failover
- ✅ Вносить реальні зміни до Keitaro
- ✅ Відправляє алерти в Message Broker
- 🔄 Процес виконується асинхронно

## Структура Preview Response

```json
{
  "summary": {
    "appId": "6754768826",
    "platform": "ios",
    "totalOperations": 11        // Загальна кількість операцій
  },
  
  "step1_campaigns": {
    "found": 3,                   // Кількість знайдених кампаній
    "campaigns": [
      {
        "id": 12345,
        "name": "Applink_iOS_6754768826_Campaign",
        "currentGroupId": 8,      // Поточна група
        "willMoveToGroupId": 9    // Нова група (banned)
      }
    ]
  },
  
  "step2_domains": {
    "found": 5,                   // Кількість доменів до оновлення
    "domains": [
      {
        "id": 501,
        "name": "example.com",
        "currentCampaignId": 12345,
        "currentGroupId": 1,
        "willSetCampaignId": 5,   // Нова дефолтна кампанія
        "willSetGroupId": 12      // Нова група доменів
      }
    ]
  },
  
  "step3_offers": {
    "found": 2,                   // Кількість оферів до переміщення
    "offers": [
      {
        "id": 5001,
        "name": "iOS_6754768826_Private",
        "currentGroupId": 7,
        "willMoveToGroupId": 11   // Banned група
      }
    ]
  },
  
  "step4_stream": {
    "streamId": 35,
    "campaignId": 5,
    "configValid": true,          // Чи конфігурація потоку правильна
    "configIssues": [             // Якщо configValid: false
      "state: expected 'active', got 'paused'"
    ],
    "currentOffer": {
      "id": 5001,
      "name": "iOS_6754768826_Private",
      "groupId": 11,
      "isBanned": true            // Чи поточний офер в banned групі
    },
    "willReplaceOffer": true,     // Чи буде заміна офера
    "replacementOffer": {         // Інфо про новий офер (якщо буде заміна)
      "id": 7001,
      "name": "iOS_6754769999_Public",
      "groupId": 10,
      "clicks": 15000,
      "reason": "Best public offer by clicks"
    }
  }
}
```

## Інтерпретація Результатів

### ✅ Все Готово до Виконання

```json
{
  "summary": { "totalOperations": 10 },
  "step1_campaigns": { "found": 3 },
  "step2_domains": { "found": 5 },
  "step3_offers": { "found": 2 },
  "step4_stream": {
    "configValid": true,
    "willReplaceOffer": true,
    "replacementOffer": { "clicks": 15000 }
  }
}
```
✅ Всі перевірки пройшли, можна запускати реальне виконання

### ⚠️ Потрібна Увага

```json
{
  "step4_stream": {
    "configValid": false,
    "configIssues": [
      "state: expected 'active', got 'paused'",
      "landings: expected [2], got []"
    ]
  }
}
```
⚠️ Конфігурація потоку не відповідає очікуваній - буде відправлено алерт

### ❌ Нічого не Знайдено

```json
{
  "summary": { "totalOperations": 0 },
  "step1_campaigns": { "found": 0, "campaigns": [] },
  "step2_domains": { "found": 0, "domains": [] },
  "step3_offers": { "found": 0, "offers": [] }
}
```
❌ Застосунок не знайдено - можливо неправильний app_id

## Типові Сценарії

### Сценарій 1: Перевірка перед баном

```bash
# 1. Спочатку дивимось що буде змінено
curl -X POST .../preview -d '{"app_id": "6754768826"}'

# 2. Аналізуємо відповідь
# 3. Якщо все ОК - запускаємо реальний бан
curl -X POST .../app-banned -d '{"app_id": "6754768826"}'
```

### Сценарій 2: Аудит системи

```bash
# Перевіряємо стан для конкретного app без внесення змін
curl -X POST .../preview -d '{"app_id": "6754768826"}' | jq
```

### Сценарій 3: Тестування конфігурації

```bash
# Перевіряємо чи правильно налаштовані групи та ID в .env
curl -X POST .../preview -d '{"app_id": "test_12345"}' | jq '.step4_stream'
```

## Різниця між Preview та Real

| Аспект | Preview | Real |
|--------|---------|------|
| Читання даних | ✅ | ✅ |
| Зміни в Keitaro | ❌ | ✅ |
| Аналіз потоку | ✅ | ✅ |
| Генерація звіту | ✅ | ✅ |
| Відправка алертів | ❌ | ✅ |
| Час виконання | ~3-5 сек | ~5-10 сек |
| Безпека | 100% | Змінює дані |

## Tips & Best Practices

1. **Завжди використовуйте preview перед real execution** 🔍
2. **Перевіряйте `totalOperations`** - якщо 0, щось не так з app_id
3. **Звертайте увагу на `configValid`** - false означає проблеми з конфігурацією
4. **Перевіряйте `replacementOffer.clicks`** - чим більше, тим краще
5. **Зберігайте preview responses** для аудиту та аналізу

## Troubleshooting

### Preview повертає 0 операцій
- Перевірте app_id - можливо він не існує в системі
- Перевірте MIN_CAMPAIGN_ID в .env
- Переконайтесь що застосунок має правильні групи

### configValid: false
- Перевірте DEFAULT_STREAM_ID та STREAM_LANDING_ID в .env
- Подивіться configIssues для деталей
- Виправте конфігурацію в Keitaro UI

### willReplaceOffer: false, але офер banned
- Можливо немає інших оферів для заміни
- Перевірте звіт за вчора - можливо немає кліків
- Переконайтесь що є офери в групах 7 та 10

## Підтримка

Для детальної інформації дивіться:
- [FAILOVER.md](./FAILOVER.md) - Повна документація процесу
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Всі доступні endpoints

