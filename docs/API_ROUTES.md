# API Routes — вхідні дані та відповіді

Усі роути під префіксом **`/api`**. Авторизація: заголовок (зазвичай `Authorization` / token guard).

---

## Загальні

| Метод | Шлях          | Body | Відповідь                                                     |
| ----- | ------------- | ---- | ------------------------------------------------------------- |
| GET   | `/api/`       | —    | `string` (привітання)                                         |
| GET   | `/api/health` | —    | `{ status, timestamp, redis: { connected, ping_ms, error } }` |

---

## Offers — `/api/offers`

| Метод  | Шлях                                 | Body (DTO)                                                                                                                                                           | Відповідь                                                                                   |
| ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| GET    | `/api/offers`                        | —                                                                                                                                                                    | Масив оферів (відповідь Keitaro)                                                            |
| GET    | `/api/offers/:id`                    | — (param: `id`)                                                                                                                                                      | Об'єкт офера                                                                                |
| POST   | `/api/offers/create/multiple`        | **CreateMultipleOffersDto**: `sources[]`, `name`, `affiliate_network_id`, `payout_value?`, `payout_currency`, `country[]`, `notes`, `payout_auto?`, `lands`, `rate?` | Результат створення оферів                                                                  |
| POST   | `/api/offers/create/single`          | **CreateSingleOfferDto**: `app_name`, `bundle_id`, `attribution_type`, `attribution_link`, `offer_group_id?`, `affiliate_network_id?`                                | Створений офер                                                                              |
| POST   | `/api/offers/create/rent-offer`      | **CreateRentOfferDto**: `name` (string), `domain` (string)                                                                                                           | Об'єкт офера Keitaro (id, name, group_id, action_payload, …)                                |
| POST   | `/api/offers/create/single/app-link` | **CreateSingleOfferAppLinkDto**: `group_id`, `name`, `link`, `service_template_id`                                                                                   | Створений офер                                                                              |
| POST   | `/api/offers/create/new-partner`     | **CreateNewPartnerDto**: `partnerName`, `mail`, `urlParams`, `testLink`, `testLinkGeo`                                                                               | `{ name, id, alias, user_id, updatedAffiliateNetworksNames, newPartnerName, newPartnerId }` |
| POST   | `/api/offers/cloak/enable`           | **EnableCloakDto**: `offerId` (number), `enableCloaking` (boolean)                                                                                                   | Результат оновлення офера                                                                   |
| POST   | `/api/offers/gray-section/enable`    | **EnableGraySectionDto**: `offerId` (number), `enableGraySection` (boolean)                                                                                          | Результат оновлення офера                                                                   |
| PATCH  | `/api/offers/update/:id`             | будь-який об'єкт оновлення офера                                                                                                                                     | Оновлений офер                                                                              |
| DELETE | `/api/offers/:id`                    | — (param: `id`)                                                                                                                                                      | Результат видалення                                                                         |
| DELETE | `/api/offers/affiliate-network/:id`  | — (param: `id`)                                                                                                                                                      | Результат видалення                                                                         |

---

## Apps (кампанії) — `/api/v1/apps`

| Метод  | Шлях                                   | Body (DTO) / Params                                                                                                                                                                                                             | Відповідь                                                        |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/v1/apps/all-campaigns`           | —                                                                                                                                                                                                                               | Масив кампаній                                                   |
| GET    | `/api/v1/apps/full-campaign-info/:id`  | param: `id`                                                                                                                                                                                                                     | Повна інфа по кампанії (campaign, streams, trafficSource, group) |
| GET    | `/api/v1/apps/campaign/:id/streams`    | param: `id`                                                                                                                                                                                                                     | Стріми кампанії                                                  |
| GET    | `/api/v1/apps/streams/:id`             | param: `id`                                                                                                                                                                                                                     | Об'єкт стріму                                                    |
| PUT    | `/api/v1/apps/streams/:id`             | **UpdateStreamDto** (param: `id`): `name?`, `action_type?`, `action_payload?`, `schema?`, `state?`, `position?`, `weight?`, `collect_clicks?`, `filter_or?`, `filters?`, `offers?`, `landings?`, `triggers?`, `action_options?` | Оновлений стрім                                                  |
| PUT    | `/api/v1/apps/campaign/:id`            | **UpdateCampaignDto** (param: `id`): `keitaroSourceId?`, `keitaroCloCampId?`, `keitaroCloToken?`, `keitaroOrgCampId?`, `keitaroOrgToken?`                                                                                       | Оновлена кампанія                                                |
| POST   | `/api/v1/apps/create-campaign`         | **CreateAppDto**: `name`, `bundle_id`, `sub_id`, `postback_url`, `isAndroid`, `isIos`, `campaign_id?`                                                                                                                           | Результат створення аппа/кампаній                                |
| POST   | `/api/v1/apps/create-rent-campaign`    | **CreateRentCampaignDto**: `groupId` (number), `offerId` (number), `name` (string)                                                                                                                                              | `{ alias, clickApiToken }` — **naming = alias**                  |
| POST   | `/api/v1/apps/copy-campaign`           | **CopyCampaignDto**: `id`, `group_id`, `name`, `sub_id?`, `change_parameters?`                                                                                                                                                  | Результат копіювання                                             |
| POST   | `/api/v1/apps/create-by-offer`         | **CreateByOfferDto**: `offer_id` (string)                                                                                                                                                                                       | Результат створення кампанії по оферу                            |
| POST   | `/api/v1/apps/create-onelink-campaign` | **CreateOnelinkCampaignDto**: `offer_id`, `bundle_id`, `app_name`, `onelink_landing_id?`, `campaign_group_id?`                                                                                                                  | Результат створення OneLink кампанії                             |
| DELETE | `/api/v1/apps/campaign/:id`            | param: `id`                                                                                                                                                                                                                     | Результат видалення                                              |
| DELETE | `/api/v1/apps/traffic-source/:id`      | param: `id`                                                                                                                                                                                                                     | Результат видалення                                              |
| POST   | `/api/v1/apps/sync`                    | **SyncAppDto**: `id`, `name`, `platform` (IOS \| ANDROID), `keitaroSourceId?`, `keitaroCloCampId?`, `oldKeitaroSourceId?`, `serverIntegration?`, `namingStreams?`                                                               | Результат синхронізації                                          |
| POST   | `/api/v1/apps/close-cloak`             | **CloseCloakDto**: `campaignId` (number)                                                                                                                                                                                        | Результат                                                        |
| POST   | `/api/v1/apps/close-geo`               | **CloseGeoDto**: `campaignId` (number), `geoCode` (string)                                                                                                                                                                      | Результат                                                        |
| POST   | `/api/v1/apps/share-naming`            | **ShareNamingDto**: `campaignId`, `appId?`, `items[]` — кожен item: `naming`, `targetCampaignId`, `keitaroCampaign?`, `oldKeitaroCampaign?` (1–10 items)                                                                        | Результат шерингу неймінгу                                       |
| POST   | `/api/v1/apps/allow-all-traffic`       | **AllowTrafficDto**: `campaignId` (number), `allow` (boolean)                                                                                                                                                                   | Результат                                                        |
| POST   | `/api/v1/apps/toggle-test-flow`        | **ToggleTestFlowDto**: `campaignId` (number), `enable` (boolean)                                                                                                                                                                | Результат                                                        |
| POST   | `/api/v1/apps/validate-integration`    | **ValidateIntegrationDto**: `campaignId` (number), `appId?` (string)                                                                                                                                                            | Результат валідації                                              |
| POST   | `/api/v1/apps/toggle-deny-org-traffic` | **ToggleDenyOrgTrafficDto**: `campaignId` (number), `enable` (boolean)                                                                                                                                                          | Результат                                                        |
| POST   | `/api/v1/apps/configure-default-flow`  | **ConfigureDefaultFlowDto**: `appCampaignId` (number), `orgCampaignId?`, `redirectToOrg?`, `bundleId?`, `appName?`                                                                                                              | Результат налаштування default flow                              |

---

## W2App — `/api/v1/w2app`

| Метод | Шлях | Body (DTO) / Params | Відповідь |
| ----- | ---- | ------------------- | --------- |
| POST  | `/api/v1/w2app/split-campaign` | **CreateSplitCampaignDto**: `campaignName`, `campaignType`, `uniquenessMethod`, `cookiesTtlHours`, `bindVisitors`, `apps[]`, `parameters`, `defaultStream` | **SplitCampaignResult**: `campaignId`, `campaignToken`, `campaignAlias`, `streamIds[]`, `defaultStreamId` |
| PUT   | `/api/v1/w2app/split-campaign/:id` | **UpdateSplitCampaignDto**: `apps?`, `parameters?` | `204` |
| GET   | `/api/v1/w2app/split-campaign/:id` | param: `id` | **SplitCampaignState**: `campaignId`, `apps[]` (`appId`, `offerId`, `weight`, `isActive`) |
| PUT   | `/api/v1/w2app/split-campaign/:id/disable` | param: `id` | `204` |
| POST  | `/api/v1/w2app/split-campaign/:id/ban-app` | **BanAppDto**: `appId` | `204` |
| POST  | `/api/v1/w2app/split-campaign/:id/unban-app` | **BanAppDto**: `appId` | `204` |
| POST  | `/api/v1/w2app/naming-campaign` | **CreateNamingCampaignDto**: `flowName`, `groupId?`, `aliases` | **NamingCampaignResult**: `campaignId`, `campaignToken` |
| PUT   | `/api/v1/w2app/naming-campaign/:id` | **UpdateNamingCampaignDto**: `aliases` | `204` |
| PUT   | `/api/v1/w2app/naming-campaign/:id/disable` | param: `id` | `204` |

---

## Groups — `/api/groups`

| Метод | Шлях          | Query / Body                                         | Відповідь                                                      |
| ----- | ------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| GET   | `/api/groups` | query: `type` (string, опційно)                      | Масив **IGroup**: `{ id, name, type, createdAt?, updatedAt? }` |
| POST  | `/api/groups` | **CreateGroupDto**: `name` (string), `type` (string) | Об'єкт групи Keitaro (response.data)                           |

---

## Domains — `/api/domains`

| Метод  | Шлях                         | Body / Params                                                                          | Відповідь                             |
| ------ | ---------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| GET    | `/api/domains`               | —                                                                                      | Масив доменів                         |
| GET    | `/api/domains/check/:domain` | param: `domain`                                                                        | `{ exists: boolean, domain: string }` |
| GET    | `/api/domains/:id`           | param: `id`                                                                            | Об'єкт домену                         |
| POST   | `/api/domains/create`        | **CreateDomainDto**: `domain` (string), `groupId` (number), `oneLinkSettings` (string) | Створений домен (IDomain)             |
| DELETE | `/api/domains/:id`           | param: `id`                                                                            | Результат видалення                   |

---

## Report — `/api/report`

| Метод | Шлях                         | Body                  | Відповідь              |
| ----- | ---------------------------- | --------------------- | ---------------------- |
| POST  | `/api/report/build`          | `Record<string, any>` | Результат збірки звіту |
| POST  | `/api/report/conversion/log` | `Record<string, any>` | Лог конверсій          |
| POST  | `/api/report/stats`          | `Record<string, any>` | Статистика             |
| POST  | `/api/report/clicks/log`     | `Record<string, any>` | Лог кліків             |

---

## Failover — `/api/failover`

| Метод | Шлях                                        | Body                                                     | Відповідь                                                                                             |
| ----- | ------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| POST  | `/api/failover/webhooks/app-banned/preview` | **AppBannedDto**: `platform` (string), `app_id` (string) | **PreviewResponseDto**: `summary`, `step1_campaigns`, `step2_domains`, `step3_offers`, `step4_stream` |
| POST  | `/api/failover/webhooks/app-banned`         | **AppBannedDto**: `platform`, `app_id`                   | `PreviewResponseDto` (результат виконання)                                                            |
| GET   | `/api/failover/webhooks/health`             | —                                                        | `{ status, timestamp }`                                                                               |

---

## Queue — `/api/queue/naming-sharing`

| Метод  | Шлях                              | Body | Відповідь                    |
| ------ | --------------------------------- | ---- | ---------------------------- |
| DELETE | `/api/queue/naming-sharing/clear` | —    | `{ success: true, message }` |

---

## Keitaro Proxy — `/api/keitaro`

| Метод | Шлях | — | Проксування запиту в Keitaro (всі методи) |

---

## Підсумок для флоу «клієнт аренди»

- **Офер по домену:** `POST /api/offers/create/rent-offer` — body: `{ name, domain }` → повертає офер (є `id`).
- **Кампанія + naming:** `POST /api/v1/apps/create-rent-campaign` — body: `{ groupId, offerId, name }` → повертає `{ alias, clickApiToken }`; **naming = alias**.
- **Група (якщо треба створити):** `POST /api/groups` — body: `{ name, type }` → повертає групу (є `id` для збереження в CRM).
