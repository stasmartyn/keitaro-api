# Endpoints Map

> Всі Keitaro API запити мають базовий URL: `{KEITARO_DOMAIN}/admin_api/v1/...`

---

## AppController

| Метод | Шлях      | Логіка                                              |
| ----- | --------- | --------------------------------------------------- |
| `GET` | `/`       | Повертає "Hello World!"                             |
| `GET` | `/health` | Перевіряє Redis — повертає `{ connected, ping_ms }` |

---

## /v1/apps

| Метод    | Шлях                                       | Логіка                                                                                                                                                    | Keitaro API                                                                                              |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET`    | `/v1/apps/all-campaigns`                   | Список усіх кампаній                                                                                                                                      | `GET campaigns`                                                                                          |
| `GET`    | `/v1/apps/full-campaign-info/:id`          | Кампанія + стріми + traffic source + group                                                                                                                | `GET campaigns/:id` → `GET campaigns/:id/streams` → `GET traffic_sources/:id` → `GET groups/:id`         |
| `GET`    | `/v1/apps/campaign/:id/streams`            | Стріми кампанії                                                                                                                                           | `GET campaigns/:id/streams`                                                                              |
| `GET`    | `/v1/apps/streams/:id`                     | Один стрім                                                                                                                                                | `GET streams/:id`                                                                                        |
| `PUT`    | `/v1/apps/streams/:id`                     | Оновити стрім                                                                                                                                             | `PUT streams/:id`                                                                                        |
| `PUT`    | `/v1/apps/campaign/:id`                    | Оновити кампанію                                                                                                                                          | `PUT campaigns/:id`                                                                                      |
| `DELETE` | `/v1/apps/campaign/:id`                    | Видалити кампанію                                                                                                                                         | `DELETE campaigns/:id`                                                                                   |
| `DELETE` | `/v1/apps/traffic-source/:id`              | Видалити traffic source                                                                                                                                   | `DELETE traffic_sources/:id`                                                                             |
| `POST`   | `/v1/apps/create-campaign`                 | Створює traffic source + CLO кампанію + CLO стріми + ORG кампанію + ORG стріми + default flow. При помилці — rollback (DELETE кожного створеного ресурсу) | `POST traffic_sources` → `POST campaigns` ×2 → `POST streams` ×4 → `GET/POST/PUT streams` (default flow) |
| `POST`   | `/v1/apps/create-rent-campaign`            | Клонує шаблон кампанії (id=4509), оновлює назву/групу, прописує offer у default stream                                                                    | `POST campaigns/4509/clone` → `PUT campaigns/:id` → `GET campaigns/:id/streams` → `PUT streams/:id`      |
| `POST`   | `/v1/apps/copy-campaign`                   | Клонує кампанію, оновлює назву/аліас/групу/параметри                                                                                                      | `POST campaigns/:id/clone` → `PUT campaigns/:clonedId`                                                   |
| `POST`   | `/v1/apps/create-by-offer`                 | Отримує offer, створює кампанію та стрім з цим offer                                                                                                      | `GET offers/:id` → `POST campaigns` → `POST streams`                                                     |
| `POST`   | `/v1/apps/create-onelink-campaign`         | Створює кампанію та стрім з landing + offer                                                                                                               | `POST campaigns` → `POST streams`                                                                        |
| `POST`   | `/v1/apps/sync`                            | Синхронізує traffic source та CLO кампанію з даними з CRM                                                                                                 | `PUT traffic_sources/:id` + `PUT campaigns/:id`                                                          |
| `POST`   | `/v1/apps/close-cloak`                     | Активує "deny all traffic" стрім                                                                                                                          | `GET campaigns/:id/streams` → `PUT streams/:denyAllId` `{ state: "active" }`                             |
| `POST`   | `/v1/apps/close-geo`                       | Додає гео-код до фільтра закритих гео, активує стрім                                                                                                      | `GET campaigns/:id/streams` → `PUT streams/:geoStreamId`                                                 |
| `POST`   | `/v1/apps/allow-all-traffic`               | Вмикає або вимикає "deny all traffic" стрім                                                                                                               | `GET campaigns/:id/streams` → `PUT streams/:id` `{ state: active/disabled }`                             |
| `POST`   | `/v1/apps/toggle-test-flow`                | Вмикає або вимикає тестовий стрім                                                                                                                         | `GET campaigns/:id/streams` → `PUT streams/:id` `{ state: active/disabled }`                             |
| `POST`   | `/v1/apps/validate-integration`            | Перевіряє наявність обов'язкових стрімів (test flow, deny all, deny org). Якщо відсутні — створює їх. Перевіряє GEO filters і default flow                | `GET campaigns/:id/streams` → `POST streams` (якщо потрібно) → `GET campaigns/:id` → повторна валідація  |
| `POST`   | `/v1/apps/toggle-deny-org-traffic`         | Вмикає або вимикає стрім "deny org traffic"                                                                                                               | `GET campaigns/:id/streams` → `PUT streams/:id` `{ state: active/disabled }`                             |
| `POST`   | `/v1/apps/configure-default-flow`          | Налаштовує default flow — редирект на ORG кампанію                                                                                                        | `GET campaigns/:id/streams` → `PUT streams/:id` або `POST streams`                                       |
| `POST`   | `/v1/apps/share-naming` _(throttle 10/хв)_ | Кладе задачу у BullMQ чергу. Worker асинхронно для кожного naming: знаходить або створює naming стрім у цільовій кампанії                                 | Async worker: `GET campaigns/:id/streams` → `POST/PUT/DELETE streams`                                    |

---

## /offers

| Метод    | Шлях                             | Логіка                                                                         | Keitaro API                                                                                              |
| -------- | -------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `GET`    | `/offers`                        | Список offers                                                                  | `GET offers`                                                                                             |
| `GET`    | `/offers/:id`                    | Один offer                                                                     | `GET offers/:id`                                                                                         |
| `POST`   | `/offers/create/multiple`        | Для кожної комбінації source×land створює offer, потім оновлює його назву з id | `GET affiliate_networks/:id` → `POST offers` ×N → `PUT offers/:id` ×N                                    |
| `POST`   | `/offers/create/single`          | Створює один offer                                                             | `POST offers`                                                                                            |
| `POST`   | `/offers/create/rent-offer`      | Створює rent offer                                                             | `POST offers`                                                                                            |
| `POST`   | `/offers/create/single/app-link` | Створює offer типу app-link                                                    | `POST offers`                                                                                            |
| `POST`   | `/offers/create/new-partner`     | Створює affiliate network + offer + кампанію + стрім для нового партнера       | `GET affiliate_networks` → `POST affiliate_networks` → `POST offers` → `POST campaigns` → `POST streams` |
| `POST`   | `/offers/cloak/enable`           | Вмикає/вимикає cloaking для offer                                              | `GET offers/:id` → `PUT offers/:id`                                                                      |
| `POST`   | `/offers/gray-section/enable`    | Вмикає/вимикає gray section для offer                                          | `GET offers/:id` → `PUT offers/:id`                                                                      |
| `PATCH`  | `/offers/update/:id`             | Оновлює offer                                                                  | `PUT offers/:id`                                                                                         |
| `DELETE` | `/offers/:id`                    | Архівує offer                                                                  | `DELETE offers/:id/archive`                                                                              |
| `DELETE` | `/offers/affiliate-network/:id`  | Видаляє affiliate network                                                      | `DELETE affiliate_networks/:id`                                                                          |

---

## /domains

| Метод    | Шлях                     | Логіка                            | Keitaro API                    |
| -------- | ------------------------ | --------------------------------- | ------------------------------ |
| `GET`    | `/domains`               | Список доменів                    | `GET domains`                  |
| `GET`    | `/domains/check/:domain` | Перевіряє чи існує домен          | `GET domains` (фільтр по name) |
| `GET`    | `/domains/:id`           | Один домен                        | `GET domains/:id`              |
| `POST`   | `/domains/create`        | Перевіряє дублікат, створює домен | `GET domains` → `POST domains` |
| `DELETE` | `/domains/:id`           | Видаляє домен                     | `DELETE domains/:id`           |

---

## /groups

| Метод  | Шлях            | Логіка               | Keitaro API           |
| ------ | --------------- | -------------------- | --------------------- |
| `GET`  | `/groups?type=` | Список груп за типом | `GET groups?type=...` |
| `POST` | `/groups`       | Створює групу        | `POST groups`         |

---

## /failover

| Метод  | Шлях                                    | Логіка                                                                                        | Keitaro API                                                                                                                       |
| ------ | --------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/failover/webhooks/health`             | Health-check                                                                                  | —                                                                                                                                 |
| `POST` | `/failover/webhooks/app-banned/preview` | Прев'ю що буде змінено (dry-run, без запису)                                                  | `GET campaigns` (paginated) → `GET domains` → `GET offers` → `GET campaigns/:id/streams` → `GET offers/:id` → `POST report/build` |
| `POST` | `/failover/webhooks/app-banned`         | Обробляє ban: переміщує кампанії/домени/offers у banned групи, замінює offer у default stream | `GET/PUT campaigns` ×N → `GET/PUT domains` ×M → `GET/PUT offers` ×K → `GET/PUT streams` → `POST report/build`                     |

---

## /report

| Метод  | Шлях                     | Логіка                                                        | Keitaro API            |
| ------ | ------------------------ | ------------------------------------------------------------- | ---------------------- |
| `POST` | `/report/build`          | Довільний report                                              | `POST report/build`    |
| `POST` | `/report/conversion/log` | Лог конверсій                                                 | `POST conversions/log` |
| `POST` | `/report/stats`          | Статистика по конверсіям/продажам за датою та групою кампаній | `POST report/build`    |
| `POST` | `/report/clicks/log`     | Лог кліків                                                    | `POST clicks/log`      |

---

## /queue

| Метод    | Шлях                          | Логіка                                        |
| -------- | ----------------------------- | --------------------------------------------- |
| `DELETE` | `/queue/naming-sharing/clear` | Повністю очищає BullMQ чергу `naming-sharing` |

---

## /keitaro (proxy)

| Метод  | Шлях                    | Логіка                                     |
| ------ | ----------------------- | ------------------------------------------ |
| `GET`  | `/keitaro/campaigns/`\* | Проксі до Keitaro (whitelist: тільки GET)  |
| `GET`  | `/keitaro/domains/*`    | Проксі до Keitaro (whitelist: тільки GET)  |
| `GET`  | `/keitaro/streams/*`    | Проксі до Keitaro (whitelist: тільки GET)  |
| `POST` | `/keitaro/report/build` | Проксі до Keitaro (whitelist: тільки POST) |
