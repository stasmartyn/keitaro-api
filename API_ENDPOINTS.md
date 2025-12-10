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

### Файли з логікою

- **Controller**: `src/apps/v1/apps.controller.ts` (рядок 118-120)
- **Service**: `src/apps/v1/apps.service.ts` (метод `validateIntegrationInternal`, рядок 901)
- **Keitaro Service**: `src/keitaro/keitaro.service.ts` (метод `validateIntegration`, рядок 1386)
