# Keitaro Management API

> Потужний REST API для управління Keitaro трекером з автоматичним failover системою

[![NestJS](https://img.shields.io/badge/NestJS-10.0-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green.svg)](https://www.mongodb.com/)

## 📋 Зміст

- [Огляд](#-огляд)
- [Основні Можливості](#-основні-можливості)
- [Архітектура](#-архітектура)
- [Швидкий Старт](#-швидкий-старт)
- [Конфігурація](#-конфігурація)
- [API Endpoints](#-api-endpoints)
- [Failover System](#-failover-system)
- [Розробка](#-розробка)
- [Deployment](#-deployment)
- [Документація](#-документація)

## 🎯 Огляд

Keitaro Management API - це комплексне рішення для автоматизації управління Keitaro трекером. Система забезпечує повний контроль над кампаніями, доменами, офферами та включає інтелектуальну систему автоматичного failover для безперебійної роботи при бані застосунків.

**Технологічний стек:**

- **Backend Framework:** NestJS 10.x
- **Мова:** TypeScript 5.x
- **База даних:** MongoDB 6.x + Mongoose
- **Логування:** Pino
- **Валідація:** class-validator, class-transformer

## ✨ Основні Можливості

### 🚀 Управління Застосунками

- Повний lifecycle мобільних застосунків (iOS/Android)
- Версії API: v1 та v2 з розширеним функціоналом
- Створення та синхронізація застосунків
- Копіювання кампаній між застосунками
- Підтримка Organic та Cloaking кампаній

### 📊 Управління Кампаніями

- Автоматичне створення кампаній для iOS/Android
- Підтримка різних типів: Organic, Cloaking, Onelink
- Налаштування traffic source parameters
- Управління geo-targeting
- Шаблони кампаній для швидкого розгортання

### 🌐 Управління Доменами

- Конфігурація та роутинг доменів
- Прив'язка доменів до кампаній
- Групування доменів
- Автоматичне перенаправлення трафіку

### 🎁 Управління Офферами

- Створення офферів з різними типами
- **Cloaking**: приховування справжнього URL від ботів
- **Gray Section**: показ різного контенту різним користувачам
- Інтеграція з affiliate мережами
- Підтримка Rent офферів

### 📁 Управління Групами

- Організація кампаній, доменів та офферів у групи
- Flexible grouping система
- Швидкий пошук та фільтрація

### ⚡ Автоматичний Failover

**Унікальна 4-кроková система автоматичного переналаштування:**

1. Переміщення забанених кампаній у спеціальну групу
2. Автоматична заміна дефолтної кампанії на доменах
3. Переміщення офферів у групу banned
4. Інтелектуальна заміна офферів на основі статистики кліків

**Два режими роботи:**

- **Preview Mode (Dry-Run)**: аналіз без внесення змін
- **Execution Mode**: автоматичне виконання всіх кроків

### 📈 Система Звітів

- Генерація звітів через Keitaro API
- Логування конверсій та кліків
- Статистика для прийняття рішень при failover
- Інтеграція з Keitaro reporting engine

### 🔌 Keitaro Proxy

- Direct proxy до Keitaro Admin API
- Доступ до всіх можливостей Keitaro через єдиний endpoint
- Автоматична аутентифікація

### 📦 Naming Sharing Queue (BullMQ)

- Асинхронна обробка naming sharing через BullMQ чергу
- Batching до 10 namings за один запит
- Автоматичний retry (3 спроби з backoff 1 година)
- Dead Letter Queue (DLQ) для failed jobs
- WebSocket progress notifications в real-time
- Bull Board для моніторингу (опціонально)

## 🏗️ Архітектура

### Модульна Структура

```
src/
├── app/              # Головний модуль додатку
├── apps/             # Управління застосунками (v1, v2)
├── auth/             # Аутентифікація через токени
├── common/           # Спільні інтерфейси, types, enums
├── config/           # Централізована конфігурація
├── database/         # MongoDB підключення та схеми
├── domains/          # Управління доменами
├── failover/         # Система автоматичного failover
├── groups/           # Управління групами
├── keitaro/          # Core Keitaro service + proxy
├── offers/           # Управління офферами
├── queue/            # BullMQ черги (naming-sharing queue)
├── redis/            # Redis підключення
├── report/           # Система звітів
└── utils/            # Утиліти (logger, retry, validators)
```

### API Versioning

Проект використовує кастомний `@VersionController` декоратор для versioning:

- **v1**: Базовий функціонал
- **v2**: Розширений функціонал з додатковими можливостями

## 🚀 Швидкий Старт

### Вимоги

- **Node.js:** 20.x або вище
- **npm:** 9.x або вище
- **MongoDB:** 6.x або вище
- **Keitaro Tracker:** встановлений та налаштований

### Встановлення

1. **Клонування репозиторію:**

```bash
git clone <repository-url>
cd keitaro_api_ts
```

2. **Встановлення залежностей:**

```bash
npm install
```

3. **Налаштування environment:**

```bash
cp .env.example .env
# Відредагуйте .env файл з вашими налаштуваннями
```

4. **Запуск сервісів через docker-compose:**

```bash
# LOCAL (MongoDB + Redis, без паролів)
docker-compose up -d

# DEV (тільки Redis, з паролем)
docker-compose -f docker-compose.dev.yml up -d

# PROD (тільки Redis, з паролем)
docker-compose -f docker-compose.prod.yml up -d
```

**Примітка:** MongoDB піднімається тільки локально. На DEV/PROD MongoDB буде managed service в інфраструктурі.

5. **Запуск в development режимі:**

```bash
npm run start:dev
```

6. **Перевірка роботи:**

```bash
# Health check (перевірка Redis та сервісу)
curl http://localhost:5005/api/health

# Failover health check
curl http://localhost:5005/api/failover/webhooks/health
```

### Production Запуск

```bash
# Збірка проекту
npm run build

# Запуск production сервера
npm run start:prod
```

### Docker Запуск

```bash
# Збірка образу
docker build -t keitaro-api .

# Запуск контейнера
docker run -p 5005:5005 --env-file .env keitaro-api
```

## ⚙️ Конфігурація

### Environment Variables

Створіть `.env` файл на основі `.env.example`:

#### Server Configuration

```env
PORT=5005                    # API порт
NODE_ENV=production          # development або production
AUTH_TOKEN=your_token_here   # Bearer token для аутентифікації
```

#### Keitaro API

```env
KEITARO_DOMAIN=https://your-keitaro.com
KEITARO_API_KEY=your_api_key
KEITARO_DOMAIN_DEV=https://dev-keitaro.com      # для development
KEITARO_API_KEY_DEV=your_dev_api_key             # для development
```

#### Keitaro Groups

```env
KEITARO_ORG_GROUP_ID=1       # ID групи для Organic кампаній
KEITARO_CLO_GROUP_ID=2       # ID групи для Cloaking кампаній
```

#### Campaign Templates

```env
IOS_CLO_CAMPAIGN_TEMPLATE_ID=100
IOS_ORG_CAMPAIGN_TEMPLATE_ID=102
ANDROID_CLO_CAMPAIGN_TEMPLATE_ID=103
ANDROID_ORG_CAMPAIGN_TEMPLATE_ID=104
```

#### Failover Configuration

```env
# Campaign Settings
APPLINK_CAMPAIGN_GROUP_ID=8              # ID групи Applink кампаній
APPLINK_BANNED_CAMPAIGN_GROUP_ID=9       # ID групи для забанених
DEFAULT_APPLINK_CAMPAIGN_ID=5            # Default кампанія для failover
MIN_CAMPAIGN_ID=0                        # Мінімальний ID для пошуку

# Domain Settings
APPLINK_BANNED_DOMAIN_GROUP_ID=12        # ID групи для забанених доменів

# Offer Settings
APPLINK_PRIVATE_OFFER_GROUP_ID=7         # ID групи приватних офферів
APPLINK_PUBLIC_OFFER_GROUP_ID=10         # ID групи публічних офферів
APPLINK_BANNED_OFFER_GROUP_ID=11         # ID групи забанених офферів

# Stream Settings
DEFAULT_STREAM_ID=35                     # ID дефолтного потоку
STREAM_LANDING_ID=2                      # ID landing page
CAMPAIGNS_PAGE_SIZE=100                  # Розмір сторінки при пагінації
```

#### Database

**LOCAL (docker-compose.yml):**
```env
MONGO_DATABASE_URI_DEV=mongodb://localhost:27017/keitaro
MONGO_DATABASE_URI=mongodb://localhost:27017/keitaro
```

**DEV/PROD:**
```env
# MongoDB піднімається окремо в інфраструктурі (managed service)
# Вкажи реальний хост та credentials для твого середовища
MONGO_DATABASE_URI_DEV=mongodb://dev_user:dev_password@dev-mongo-host:27017/keitaro_dev?authSource=admin
MONGO_DATABASE_URI=mongodb://prod_user:prod_password@prod-mongo-cluster:27017/keitaro_prod?authSource=admin
```

#### Redis Configuration

Redis використовується як backing store для BullMQ черг та кешування. Підтримує три режими: всі три (LOCAL/DEV/PROD) запускаються через docker-compose з різними портами та паролями.

**Environment Variables (для всіх середовищ):**

```env
# Базові налаштування
REDIS_HOST=localhost              # Хост Redis (для локального тестування: localhost, для реальних середовищ: service name або IP)
REDIS_PORT=6379                   # Порт Redis (LOCAL: 6379, DEV: 6380, PROD: 6381)
REDIS_DB=0                        # Номер бази даних (опціонально, за замовчуванням 0)

# Безпека (для DEV/PROD)
REDIS_PASSWORD=your_password      # Пароль (якщо потрібен)
REDIS_TLS=false                  # Увімкнути TLS (true/false)
REDIS_USERNAME=your_username     # Username (якщо потрібен)

# Альтернатива: повний URL
REDIS_URL=redis://username:password@host:port/db
```

**Режими роботи:**

- **LOCAL**: Redis запускається через `docker-compose up -d`, підключення через `localhost:6379` (без пароля)
- **DEV**: Redis запускається через `docker-compose -f docker-compose.dev.yml up -d`, підключення через `localhost:6380` (з паролем)
- **PROD**: Redis запускається через `docker-compose -f docker-compose.prod.yml up -d`, підключення через `localhost:6381` (з паролем)

**LOCAL (docker-compose.yml):**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
# Пароль не потрібен для локального Redis
```

**DEV (docker-compose.dev.yml):**
```env
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=dev_redis_password
REDIS_TLS=false
```

**PROD (docker-compose.prod.yml):**
```env
REDIS_HOST=localhost
REDIS_PORT=6381
REDIS_PASSWORD=prod_redis_secure_password_123
REDIS_TLS=false
```

**Примітка:** 
- Для локального тестування всі три compose файли використовують `localhost` з різними портами
- В реальних DEV/PROD середовищах (якщо Redis не в docker-compose) заміни `localhost` на реальні хости Redis сервісів

#### Bull Board (опціонально)

```env
ENABLE_BULL_BOARD=true  # Увімкнути Bull Board UI для моніторингу черг
```

Якщо увімкнено, доступний UI за адресою: `http://localhost:5005/api/admin/queues`

## 📡 API Endpoints

### Base URL

```
http://localhost:5005/api
```

### Аутентифікація

Всі endpoints потребують Bearer token в headers:

```bash
Authorization: Bearer YOUR_AUTH_TOKEN
```

**Винятки:**
- `GET /api/health` - не потребує автентифікації (для моніторингу та health checks)

### Основні Групи Endpoints

#### 1️⃣ Apps Management

**v1 Endpoints:**

- `POST /api/apps/create` - Створення нового застосунку
- `POST /api/apps/sync` - Синхронізація застосунку
- `POST /api/apps/copy-campaign` - Копіювання кампанії
- `POST /api/v1/apps/share-naming` - Naming sharing (асинхронно через BullMQ, з batching)

**v2 Endpoints (розширений функціонал):**

- `POST /api/v2/apps/create` - Створення з додатковими параметрами
- `POST /api/v2/apps/onelink` - Створення Onelink кампанії
- `POST /api/v2/apps/close-geo` - Закриття geo
- `POST /api/v2/apps/close-cloak` - Закриття cloaking

#### 2️⃣ Domains Management

- `POST /api/domains/create` - Створення нового домену

```bash
curl -X POST http://localhost:5005/api/domains/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "example.com",
    "default_campaign_id": 123,
    "domain_group_id": 5
  }'
```

#### 3️⃣ Offers Management

- `POST /api/offers/create` - Створення оффера
- `POST /api/offers/create/rent-offer` - Створення Rent оффера
- `POST /api/offers/cloak/enable` - Увімкнення/вимкнення cloaking
- `POST /api/offers/gray-section/enable` - Увімкнення/вимкнення gray section
- `PATCH /api/offers/update/:id` - Оновлення оффера
- `DELETE /api/offers/:id` - Видалення оффера

**Приклад: Увімкнення Cloaking**

```bash
curl -X POST http://localhost:5005/api/offers/cloak/enable \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "offerId": 12345,
    "enableCloaking": true
  }'
```

#### 4️⃣ Groups Management

- `POST /api/groups/create` - Створення групи
- `GET /api/groups` - Отримання всіх груп

#### 5️⃣ Failover Webhooks

**Preview Mode (Dry-Run):**

```bash
curl -X POST http://localhost:5005/api/failover/webhooks/app-banned/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "app_id": "6754768826"
  }'
```

**Execution Mode:**

```bash
curl -X POST http://localhost:5005/api/failover/webhooks/app-banned \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "app_id": "6754768826"
  }'
```

**Health Check:**

```bash
curl -X POST http://localhost:5005/api/failover/webhooks/health
```

#### 6️⃣ Reports

- `POST /api/report/build` - Генерація звіту
- `POST /api/report/conversion/log` - Логування конверсії
- `POST /api/report/clicks/log` - Логування кліку
- `POST /api/report/stats` - Статистика

#### 7️⃣ Keitaro Proxy

- `ALL /api/keitaro/*` - Direct proxy до Keitaro Admin API

Приклад:

```bash
# Прямий доступ до Keitaro API через proxy
curl http://localhost:5005/api/keitaro/admin_api/v1/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 8️⃣ Naming Sharing Queue

**Endpoint:** `POST /api/v1/apps/share-naming`

**Новий формат (з batching):**

```bash
curl -X POST http://localhost:5005/api/v1/apps/share-naming \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": 129,
    "appId": 456,
    "items": [
      {"naming": "naming-1", "targetCampaignId": 22},
      {"naming": "naming-2", "targetCampaignId": 44},
      {"naming": "naming-3", "targetCampaignId": 51}
    ]
  }'
```

**Response (асинхронний):**

```json
{
  "success": true,
  "jobId": "1",
  "queue": "naming-sharing",
  "itemsCount": 3,
  "message": "Naming sharing job added to queue successfully"
}
```

**Особливості:**

- ✅ Batching: до 10 namings за один запит
- ✅ Асинхронна обробка через BullMQ
- ✅ WebSocket progress: `/naming-sharing-progress` namespace
- ✅ Автоматичний retry: 3 спроби з backoff 1 година
- ✅ DLQ: failed jobs після 3 спроб
- ✅ Bull Board: `/api/admin/queues` (якщо `ENABLE_BULL_BOARD=true`)

**Примітка:** 
- Endpoint залишився той самий (`/api/v1/apps/share-naming`), але тепер працює асинхронно через BullMQ чергу
- Старий формат (тільки `campaignId`) більше не підтримується - потрібно передавати `items[]` масив
- Frontend код не потребує змін - endpoint той самий, тільки payload змінився

**Queue Management:**

```bash
# Очищення черги
curl -X DELETE http://localhost:5005/api/queue/naming-sharing/clear
```

## ⚡ Failover System

### Огляд Процесу

Автоматична система переналаштування при бані застосунків включає 4 основні кроки:

```
App Banned Event → Validation → Failover Service → 4 Steps → Result
```

### 4 Кроки Failover

1. **Крок 1: Кампанії**
    - Знаходить всі Applink кампанії з забаненим app_id
    - Переміщує їх у групу "Applink banned"

2. **Крок 2: Домени**
    - Знаходить домени, що використовують забанені кампанії
    - Змінює їх default_campaign на "Applink" кампанію
    - Переміщує у групу "Applink banned domains"

3. **Крок 3: Оффери**
    - Знаходить оффери з забаненим app_id
    - Переміщує їх у групу "Applink banned offers"

4. **Крок 4: Stream**
    - Перевіряє конфігурацію дефолтного stream
    - Якщо поточний оффер забанений:
        - Генерує звіт за вчора
        - Знаходить найкращий оффер (public > private)
        - Оновлює stream з новим оффером

### Preview vs Execution Mode

**Preview Mode** (`/app-banned/preview`):

- ✅ Виконує всі перевірки
- ✅ Показує що буде змінено
- ❌ НЕ вносить реальних змін
- 🎯 Використовуйте для тестування

**Execution Mode** (`/app-banned`):

- ✅ Виконує всі перевірки
- ✅ Показує що змінено
- ✅ Вносить реальні зміни в Keitaro
- 🎯 Використовуйте для production

### Приклад Preview Response

```json
{
  "summary": {
    "appId": "6754768826",
    "platform": "ios",
    "totalOperations": 6
  },
  "step1_campaigns": {
    "found": 1,
    "campaigns": [
      {
        "id": 5804,
        "name": "Onelink 6754768826 (FlavorMap)",
        "currentGroupId": 40,
        "willMoveToGroupId": 317
      }
    ]
  },
  "step2_domains": {
    "found": 2,
    "domains": [...]
  },
  "step3_offers": {
    "found": 2,
    "offers": [...]
  },
  "step4_stream": {
    "streamId": 88537,
    "campaignId": 7357,
    "configValid": true,
    "currentOffer": {...},
    "willReplaceOffer": true,
    "replacementOffer": {
      "id": 24463,
      "name": "affise 6755236789 (Match Strike)",
      "clicks": 1414,
      "reason": "Best private offer by clicks"
    }
  }
}
```

## 🛠️ Розробка

### Available Scripts

```bash
# Development
npm run start:dev          # Запуск з watch mode
npm run start:debug        # Запуск з debugger

# Production
npm run build              # Збірка проекту
npm run start:prod         # Запуск production build

# Testing
npm run test               # Unit тести
npm run test:watch         # Тести з watch mode
npm run test:e2e           # End-to-end тести
npm run test:cov           # Тести з coverage

# Code Quality
npm run lint               # Перевірка коду (prettier + eslint)
npm run format             # Форматування коду
```

### Структура Проекту

```
keitaro_api_ts/
├── src/                   # Вихідний код
│   ├── app/              # Головний модуль
│   ├── apps/             # Apps module (v1, v2)
│   ├── auth/             # Authentication
│   ├── common/           # Спільні типи
│   ├── config/           # Configuration
│   ├── database/         # MongoDB schemas
│   ├── domains/          # Domains module
│   ├── failover/         # Failover module
│   ├── groups/           # Groups module
│   ├── keitaro/          # Keitaro service
│   ├── offers/           # Offers module
│   ├── report/           # Reports module
│   └── utils/            # Utilities
├── test/                  # E2E тести
├── dist/                  # Compiled code
├── .env.example          # Environment template
├── Dockerfile            # Docker configuration
├── Jenkinsfile           # CI/CD pipeline
└── package.json          # Dependencies

Документація:
├── API_ENDPOINTS.md      # Детальний опис API
├── FAILOVER.md           # Повна документація failover
├── PREVIEW_GUIDE.md      # Гайд по preview mode
└── PROJECT.md            # Архітектура проекту
```

### Testing

```bash
# Запуск unit тестів
npm run test

# E2E тести для різних модулів
npm run test:e2e

# Coverage звіт
npm run test:cov
```

### Git Hooks

Проект використовує Husky для автоматичних перевірок:

- **pre-commit**: lint-staged (prettier + eslint)
- **pre-push**: tests

## 🚢 Deployment

### PM2 Deployment

```bash
# Встановлення PM2
npm install -g pm2

# Запуск з PM2
pm2 start npm --name keitaro-api -- run start:prod

# Моніторинг
pm2 logs keitaro-api
pm2 monit

# Автозапуск при reboot
pm2 startup
pm2 save
```

### Docker Deployment

```bash
# Збірка образу
docker build -t keitaro-api:latest .

# Запуск контейнера
docker run -d \
  --name keitaro-api \
  -p 5005:5005 \
  --env-file .env \
  --restart unless-stopped \
  keitaro-api:latest

# Перегляд логів
docker logs -f keitaro-api
```

### Environment Setup

**Development:**

```env
NODE_ENV=development
KEITARO_DOMAIN=https://dev-keitaro.com
MONGO_DATABASE_URI=mongodb://localhost:27017/keitaro_dev
```

**Production:**

```env
NODE_ENV=production
KEITARO_DOMAIN=https://keitaro.com
MONGO_DATABASE_URI=mongodb://mongo:27017/keitaro
```

## 📚 Документація

### Детальна Документація

- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Повний список всіх API endpoints з прикладами
- **[FAILOVER.md](./FAILOVER.md)** - Детальний опис failover системи з архітектурою
- **[PREVIEW_GUIDE.md](./PREVIEW_GUIDE.md)** - Гайд по використанню preview mode
- **[PROJECT.md](./PROJECT.md)** - Архітектура та структура проекту

### Корисні Посилання

- [NestJS Documentation](https://docs.nestjs.com)
- [MongoDB Documentation](https://docs.mongodb.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 🤝 Підтримка

Якщо у вас виникли питання або проблеми:

1. Перевірте [API_ENDPOINTS.md](./API_ENDPOINTS.md) для прикладів використання
2. Перегляньте [FAILOVER.md](./FAILOVER.md) для failover документації
3. Перевірте логи: `pm2 logs keitaro-api` або `docker logs keitaro-api`

## 📝 Ліцензія

UNLICENSED - Приватний проект

---

**Версія:** 0.0.1  
**Розробник:** TBAppTech  
**Framework:** NestJS 10.x + TypeScript 5.x
