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

```
http://localhost:5005/api/v1/apps
```

## 1. Створення компанії (Campaign)

```
POST /api/v2/apps/create-campaign
```

### Приклад запиту для v2 (створення з template)

```bash
curl -X POST http://localhost:5005/api/v2/apps/create-campaign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Campaign",
    "bundle_id": "com.example.app",
    "sub_id": "123",
    "postback_url": "https://panel.panel-int.xyz/events_sender/?onesignal_id={onesignal_id}&advertising_id={advertising_id}&bundle_id={bundle_id}&status={status}&offer_id={offer_id}",
    "isAndroid": false,
    "isIos": true
  }'
```

### Приклад відповіді (Response)

```json
{
  "trafficSourceId": 123,
  "orgCampaign": {
    "campaignId": 456,
    "campaignToken": "abc123def456",
    "campaignAlias": "xyz789abc",
    "orgFalseId": 789
  },
  "cloCampaign": {
    "campaignId": 321,
    "campaignToken": "def456ghi789",
    "campaignAlias": "jkl012mno",
    "clTrueId": 654,
    "clFalseId": 987
  }
}
```

### Файли з логікою

- **Controller**: `src/apps/v2/apps.controller.ts` (рядок 10-12)
- **Service**: `src/apps/v2/apps.service.ts` (метод `createAppInternal`, рядок 47)
- **Keitaro Service**: `src/keitaro/keitaro.service.ts`
    - `copyCampaign` (рядок 444) - копіювання кампанії з template
    - `updateCampaign` (рядок 463) - оновлення скопійованої кампанії
    - `getCampaignStreams` - отримання streams з template
    - `updateDefaultFlowWithOrgCampaign` - оновлення default flow

## 2. Закриття клоаки (Close Cloak)

### Endpoint

```
POST /api/v1/apps/close-cloak
```

### Приклад запиту (cURL)

```bash
curl -X POST http://localhost:5005/api/v1/apps/close-cloak \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "campaignId": 123
  }'
```

### Приклад відповіді (Response)

```json
{
  "id": 789,
  "campaign_id": 123,
  "name": "deny all traffic",
  "type": "forced",
  "state": "active",
  "action_type": "do_nothing",
  "position": 2,
  "weight": 0,
  "schema": "action",
  "collect_clicks": true,
  "filters": [],
  "offers": [],
  "landings": []
}
```

### Файли з логікою

- **Controller**: `src/apps/v1/apps.controller.ts` (рядок 93-95)
- **Service**: `src/apps/v1/apps.service.ts` (метод `closeCloakInternal`, рядок 838)
- **Keitaro Service**: `src/keitaro/keitaro.service.ts` (метод `closeCloak`, рядок 830)

## 3. Тестовий поток (Toggle Test Flow)

### Endpoint

```
POST /api/v1/apps/toggle-test-flow
```

### Приклад запиту - Увімкнути тестовий поток (cURL)

```bash
curl -X POST http://localhost:5005/api/v1/apps/toggle-test-flow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "campaignId": 123,
    "enable": true
  }'
```

### Приклад відповіді (Response)

```json
{
  "id": 456,
  "campaign_id": 123,
  "name": "test flow",
  "type": "forced",
  "state": "active",
  "action_type": "http",
  "position": 1,
  "weight": 0,
  "schema": "landings",
  "collect_clicks": true,
  "filters": [
    {
      "name": "country",
      "mode": "accept",
      "payload": ["PL", "UA", "RO", "MD"]
    }
  ],
  "offers": [
    {
      "offer_id": 3412,
      "share": 100,
      "state": "active"
    }
  ],
  "landings": []
}
```

### Файли з логікою

- **Controller**: `src/apps/v1/apps.controller.ts` (рядок 113-115)
- **Service**: `src/apps/v1/apps.service.ts` (метод `toggleTestFlowInternal`, рядок 889)
- **Keitaro Service**: `src/keitaro/keitaro.service.ts` (метод `toggleTestFlow`, рядок 1002)

## 4. Deny Org Traffic (Блокування органічного трафіку)

### Endpoint

```
POST /api/v1/apps/toggle-deny-org-traffic
```

### Приклад запиту - Увімкнути блокування (cURL)

```bash
curl -X POST http://localhost:5005/api/v1/apps/toggle-deny-org-traffic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "campaignId": 123,
    "enable": true
  }'
```

### Приклад відповіді (Response)

```json
{
  "id": 234,
  "campaign_id": 123,
  "name": "deny org traffic",
  "type": "forced",
  "state": "active",
  "action_type": "do_nothing",
  "position": 3,
  "weight": 0,
  "schema": "action",
  "collect_clicks": true,
  "filter_or": false,
  "filters": [
    {
      "name": "sub_id_17",
      "mode": "reject",
      "payload": null
    }
  ],
  "offers": [],
  "landings": []
}
```

### Файли з логікою

- **Controller**: `src/apps/v1/apps.controller.ts` (рядок 123-125)
- **Service**: `src/apps/v1/apps.service.ts` (метод `toggleDenyOrgTrafficInternal`, рядок 911)
- **Keitaro Service**: `src/keitaro/keitaro.service.ts` (метод `toggleDenyOrgTraffic`, рядок 1356)

## 5. Пошарка неймінгу (Share Naming)

### Endpoint

```
POST /api/v1/apps/share-naming
```

### Приклад запиту (cURL)

```bash
curl -X POST http://localhost:5005/api/v1/apps/share-naming \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "campaignId": 123,
    "naming": "test_naming",
    "targetCampaignId": 456
  }'
```

### Приклад відповіді (Response)

```json
{
  "id": 567,
  "campaign_id": 123,
  "name": "Naming Share: test_naming",
  "type": "regular",
  "state": "active",
  "action_type": "campaign",
  "action_payload": "456",
  "position": 1,
  "weight": 100,
  "schema": "landings",
  "filters": [
    {
      "name": "sub_id_17",
      "mode": "accept",
      "payload": ["test_naming"]
    }
  ],
  "offers": [],
  "landings": []
}
```

### Файли з логікою

- **Controller**: `src/apps/v1/apps.controller.ts` (рядок 108-110)
- **Service**: `src/apps/v1/apps.service.ts` (метод `shareNamingInternal`, рядок 873)
- **Keitaro Service**: `src/keitaro/keitaro.service.ts` (метод `shareNaming`, рядок 964)

## 6. Закриття гео (Close Geo)

### Endpoint

```
POST /api/v1/apps/close-geo
```

### Приклад запиту (cURL)

```bash
curl -X POST http://localhost:5005/api/v1/apps/close-geo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "campaignId": 123,
    "geoCode": "US"
  }'
```

### Приклад відповіді (Response)

```json
{
  "id": 345,
  "campaign_id": 123,
  "name": "closed geo filter",
  "type": "forced",
  "state": "active",
  "action_type": "do_nothing",
  "position": 1,
  "weight": 0,
  "schema": "action",
  "collect_clicks": true,
  "filters": [
    {
      "name": "country",
      "mode": "reject",
      "payload": ["US"]
    }
  ],
  "offers": [],
  "landings": []
}
```

### Файли з логікою

- **Controller**: `src/apps/v1/apps.controller.ts` (рядок 103-105)
- **Service**: `src/apps/v1/apps.service.ts` (метод `closeGeoInternal`, рядок 861)
- **Keitaro Service**: `src/keitaro/keitaro.service.ts` (метод `closeGeo`, рядок 891)

## 7. Перевірка інтеграції (Validate Integration)

### Endpoint

```
POST /api/v1/apps/validate-integration
```

### Приклад запиту (cURL)

```bash
curl -X POST http://localhost:5005/api/v1/apps/validate-integration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "campaignId": 123
  }'
```

### Приклад відповіді (Response)

```json
{
  "valid": true,
  "warnings": [],
  "createdStreams": [
    {
      "name": "test flow",
      "id": 456
    },
    {
      "name": "deny org traffic",
      "id": 234
    }
  ],
  "issues": []
}
```

### Приклад відповіді з помилками (Response)

```json
{
  "valid": false,
  "warnings": [
    "Знайдено зайві потоки: extra_stream_1, extra_stream_2"
  ],
  "createdStreams": [],
  "issues": [
    {
      "type": "incorrect_config",
      "streamName": "filter test flow",
      "message": "Filter потік має містити фільтри"
    },
    {
      "type": "incorrect_config",
      "streamName": "Naming Share: test_naming",
      "message": "Naming потік має містити фільтр sub_id_17"
    }
  ]
}
```

### Файли з логікою

- **Controller**: `src/apps/v1/apps.controller.ts` (рядок 118-120)
- **Service**: `src/apps/v1/apps.service.ts` (метод `validateIntegrationInternal`, рядок 901)
- **Keitaro Service**: `src/keitaro/keitaro.service.ts` (метод `validateIntegration`, рядок 1386)
