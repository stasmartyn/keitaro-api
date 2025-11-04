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
