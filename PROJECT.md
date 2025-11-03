# Keitaro API - Опис проекту

## Загальний опис

Проект є REST API сервісом на базі NestJS, який працює як проксі та обгортка над Keitaro API. Основна мета - автоматизація створення та управління кампаніями, додатками, оферами та іншими сутностями в системі Keitaro.

## Технологічний стек

- **Framework**: NestJS 10.x (TypeScript)
- **База даних**: MongoDB (Mongoose)
- **HTTP Client**: Axios
- **Логування**: Pino
- **Валідація**: class-validator, class-transformer

## Архітектура

### Структура модулів

Проект організований за модульним принципом NestJS з чіткою розділеністю відповідальностей:

#### 1. **Apps Module** (`src/apps/`)

- Управління мобільними додатками (iOS/Android)
- Створення кампаній для додатків
- Синхронізація даних кампаній
- Версіонування API: v1 та v2
- Зберігає дані в MongoDB (iOS/Android app схеми)

#### 2. **Groups Module** (`src/groups/`)

- Управління групами в Keitaro
- Створення та конфігурація груп

#### 3. **Domains Module** (`src/domains/`)

- Управління доменами
- Створення та налаштування доменів

#### 4. **Offers Module** (`src/offers/`)

- Управління оферами
- Створення оферів
- Налаштування cloak та gray секцій
- Робота з affiliate мережами

#### 5. **Keitaro Module** (`src/keitaro/`)

- **KeitaroService**: Основний сервіс для взаємодії з Keitaro API
    - Створення кампаній з різними шаблонами (iOS/Android, CLO/ORG)
    - Управління traffic sources, streams, campaigns
    - Константи для конфігурації кампаній
- **KeitaroProxyService**: Проксі сервіс для прозорої передачі запитів до Keitaro API
- **KeitaroProxyController**: Контролер для проксі маршрутів

#### 6. **Database Module** (`src/database/`)

- Підключення до MongoDB
- Mongoose схеми:
    - `ios-app.model.ts` - iOS додатки
    - `android-app.model.ts` - Android додатки
    - `campaign-user.model.ts` - Користувачі кампаній

#### 7. **Auth Module** (`src/auth/`)

- **TokenGuard**: Глобальний guard для автентифікації через токен
- Захищає всі ендпоінти (додається через APP_GUARD)

#### 8. **Config Module** (`src/config/`)

- Централізована конфігурація з environment змінних
- Налаштування:
    - Keitaro домени та API ключі (dev/prod)
    - Group IDs (org, clo)
    - Campaign template IDs для різних типів
    - MongoDB URI (dev/prod)
    - AUTH_TOKEN

#### 9. **Utils** (`src/utils/`)

- **Logger**: Кастомний логер на базі Pino
- **error-wrapper**: Обробка помилок
- **generateUniqueAlias**: Генерація унікальних аліасів
- **version.decorator**: Декоратор для версіонування API

### Потік даних

1. **Вхідний запит** → TokenGuard (перевірка автентифікації)
2. **Controller** → приймає запит, валідує DTO
3. **Service** → бізнес-логіка, виклики до KeitaroService або прямі HTTP запити
4. **KeitaroService/KeitaroProxyService** → взаємодія з Keitaro API
5. **Database Module** → збереження/отримання даних з MongoDB
6. **Response** → повернення результату клієнту

### Версіонування API

API підтримує версіонування через декоратор `@Version()`:

- **v1**: Старі версії контролерів (apps.v1)
- **v2**: Нові версії контролерів (apps.v2)

### Типи кампаній

Система підтримує різні типи кампаній:

- **iOS CLO/ORG**: Для iOS додатків з різними групами
- **Android CLO/ORG**: Для Android додатків
- **Rent campaigns**: Для оренди кампаній
- **OneLink campaigns**: Для OneLink інтеграцій
- **No-ORG campaigns**: Кампанії без ORG групи

## Конфігурація

Всі налаштування зберігаються в environment змінних та завантажуються через `ConfigModule`.

Основні змінні:

- `PORT` - порт сервера (за замовчуванням 5005)
- `NODE_ENV` - оточення (development/production)
- `AUTH_TOKEN` - токен для автентифікації
- `KEITARO_DOMAIN` / `KEITARO_DOMAIN_DEV` - домени Keitaro
- `KEITARO_API_KEY` / `KEITARO_API_KEY_DEV` - API ключі
- `MONGO_DATABASE_URI` / `MONGO_DATABASE_URI_DEV` - MongoDB connection strings
- Різні template IDs та group IDs для кампаній

## Безпека

- Усі ендпоінти захищені через глобальний `TokenGuard`
- Автентифікація через токен (header)
- Валідація вхідних даних через class-validator

## Логування

Використовується кастомний логер на базі Pino з підтримкою різних рівнів логування (error, warn, log, debug, verbose).

## Тестування

- Unit тести: `*.spec.ts` файли
- E2E тести: `test/*.e2e-spec.ts`
- Використовується Jest
