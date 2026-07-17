# Модуль: Интеграции (integrations)

> Спецификация подключения внешних источников: Tilda, WordPress, Яндекс Директ, универсальный webhook. Только ADMIN.
> Связанные файлы: `.docs/database.md` (`ApiKey`, `IntegrationSource`, `Company.settings`), `.docs/modules/leads-intake.md`, `.docs/modules/notifications.md` (мониторинг источников).

---

## Содержание

1. Цели модуля
2. `companyId` в URL вебхуков
3. Tilda, WordPress
4. Тумблер включения источника
5. Яндекс Директ
6. Экспорт квалификаций в Яндекс.Метрику (Phase 22.5 — research завершён, GO)
7. Универсальный Webhook — API-ключи
8. Статус здоровья источников
9. API-эндпоинты
10. Файлы, которые создаются
11. Серверные правила безопасности
12. Связи с другими модулями

---

⚠️ Точка риска: точный лимит "количество доступов" для типа
"для авторизации пользователей" не задокументирован явно —
нужно проверить в личном кабинете oauth.yandex.ru при создании
приложения (там обычно показывается конкретная цифра) либо
уточнить в поддержке Яндекс.OAuth перед масштабированием.

⚠️ Точка риска: не выяснено, сохраняется ли доступ к настройкам API
в личном кабинете Директа, если единственная кампания-пустышка
будет удалена/архивирована. Рекомендация: не удалять кампанию-пустышку,
держать в статусе "черновик/остановлена".

## Цели модуля

После завершения этого модуля:

- Видны URL вебхуков для каждого источника, с кнопкой «Скопировать»
- Tilda и WordPress отправляют лиды по этим URL
- Яндекс Директ подключается через OAuth
- Для любого другого сайта — API-ключ
- Видно состояние здоровья каждого источника (активен / последняя ошибка / молчит)
- **Тумблер включения на каждом источнике** (Tilda, WordPress, каждый API-ключ отдельно):
  выключенный источник ведёт себя так, будто его у компании не существует — вебхук
  отклоняет запрос, никакой лид не создаётся и не уведомляется. См. раздел «Тумблер
  включения источника» ниже.

**Не входит в модуль:**

- WhatsApp как источник — рассматривался в одной из версий, **решили полностью отказаться**; карточки/интеграции под него не существует

---

## `companyId` в URL вебхуков

Компаний много с первого дня — их создаёт платформенный администратор (`.docs/modules/platform-admin.md`).

```
APP_URL + "/api/webhooks/tilda/" + companyId
APP_URL + "/api/webhooks/wordpress/" + companyId
```

`GET /api/settings/webhook-urls` — берёт `companyId` из сессии текущего пользователя.

---

## Tilda, WordPress

3 шага подключения: скопировать URL → вставить в настройки вебхука сайта → отправить тестовую заявку. Тестовый запрос Tilda (`test=test`) обрабатывается без создания лида — независимо от тумблера включения (см. ниже), это не реальный лид. Статус «Подключено» — по наличию хотя бы одного лида с этим источником.

---

## Тумблер включения источника (v4.2)

У каждого источника на `/admin/integrations` — тумблер в шапке карточки (Tilda, WordPress) или в строке таблицы (каждый API-ключ универсального webhook отдельно, свой тумблер на ключ). Мотивация: администратор включает только те источники, из которых реально получает лиды — выключенный источник должен вести себя так, будто его у компании не существует, а не просто «молчать».

**Это единственное намеренное исключение из инварианта «лид нельзя потерять»** (`CLAUDE.md`): вебхук выключенного источника **отклоняет запрос**, лид не создаётся — в отличие от блокировки компании (`Company.isBlocked`), которая не останавливает приём. Разница осознанная: блокировка компании — временное состояние вне контроля клиента (просрочка оплаты), выключенный источник — явное действие администратора «у меня нет такого канала лидов».

- **Tilda/WordPress** — булев тумблер на компанию, `Company.settings.sourceEnabled: { tilda: boolean; wordpress: boolean }` (по умолчанию `true` — существующие подключения продолжают работать без вмешательства), `PATCH /api/settings { sourceEnabled: { tilda?, wordpress? } }` (ADMIN only — маркетолог видит тумблер, но не может его переключить, как и `yandexMode`).
- **API-ключи (универсальный webhook)** — свой тумблер на каждый `ApiKey.isEnabled` (миграция `add_api_key_enabled`, по умолчанию `true`), `PATCH /api/api-keys/:id { isEnabled }` (ADMIN + маркетолог — тот же actor, что уже создаёт/удаляет ключи).
- **Приём вебхука**: `tilda/[companyId]`, `wordpress/[companyId]` читают `settings.sourceEnabled` из уже загруженной `Company`; универсальный `webhooks/leads` читает `isEnabled` прямо из результата `verifyApiKey()`. Выключен → `403 { error: "SOURCE_DISABLED" }` **до** `createLead`/`touchIntegrationSource` — лид не создаётся, здоровье источника не трогается (это не ошибка обработки, это намеренный отказ).
- **UI при выключенном источнике** — карточка/строка показывает только сам факт существования источника (иконка, название, бейдж «Выключено», тумблер): скрыты URL вебхука/маска ключа и индикатор здоровья, вместо них — нейтральное сообщение «Источник выключен — заявки по нему не принимаются».
- **Здоровье**: `getSourceHealth()` возвращает статус `disabled` (⛔) для Tilda/WordPress при выключенном тумблере — приоритетнее обычного расчёта по `lastUsedAt`. Для API-ключей `disabled` считается по конкретной строке в `ApiKeysTable` (не по `getSourceHealth()`), потому что `ApiKey.sourceLabel` не уникален — несколько ключей могут делить один `IntegrationSource`, и включённость одного не должна прятать здоровье другого.
- **Мониторинг источников** (`checkSourceHealth`, Phase 17): выключенный источник пропускается целиком — не порождает `SOURCE_DOWN`. Для API — «включён», если хотя бы один `ApiKey` с этим `sourceLabel` активен (лиды могли продолжать идти через другой ключ с тем же лейблом).

---

## Яндекс Директ

Два режима — `UTM` (минимальный, работает всегда, без подключения кабинета) и `FULL` (обогащение через Direct API). Переключатель режима — `Company.settings.yandexMode: "UTM" | "FULL"` (Phase 18, `PATCH /api/settings`, ADMIN only). **`yandexMode` — это только режим**, к хранению токенов отношения не имеет.

### Токены — server-only колонки `Company`, не `Company.settings`

Access/refresh-токены Direct API хранятся отдельными nullable-колонками `Company` (`yandexAccessToken`, `yandexRefreshToken`, `yandexTokenExpiresAt`, `yandexLogin` — см. `.docs/database.md`), **никогда** в JSONB `settings`. Причина конкретна, не стилистическая: `getSettings()` → `toPublicSettings()` (`lib/settings/getSettings.ts:31-36`) стрипает из ответа `GET /api/settings` только одно поле — `roundRobinCursor`; любое другое поле, положенное в `settings`, включая гипотетические токены, ушло бы клиенту как есть — а `GET /api/settings` доступен и ADMIN, и маркетологу. Отдельные колонки читаются только сервером, ни один эндпоинт их не возвращает (см. «Серверные правила безопасности» ниже).

### OAuth-флоу (авторизационный код, не implicit)

`GET /api/integrations/yandex` — статус подключения (JSON, `{ connected, login, mode }`), не участвует в самом OAuth-редиректе. Кнопка «Подключить кабинет» на `YandexDirectCard.tsx` — обычная ссылка на отдельный redirect-эндпоинт (ниже, шаг 1), не fetch к статусу.

1. **Authorize URL** — `GET /api/integrations/yandex/authorize` (ADMIN) минтит **свежий** `state` в момент запроса (не при рендере страницы — иначе он может протухнуть до клика) и строит редирект на `https://oauth.yandex.ru/authorize` с `response_type=code`, `client_id=YANDEX_OAUTH_CLIENT_ID`, `redirect_uri=YANDEX_OAUTH_REDIRECT_URI`, `scope=direct:api`, `state=<подписанный, содержит companyId>`. `state` — CSRF-защита: подписывается сервером (HMAC на `AUTH_SECRET`) с TTL, а не просто случайный nonce без проверки, иначе callback не может доверять `companyId` из него.
2. Пользователь подтверждает доступ на стороне Яндекса → редирект на `redirect_uri` с `code` и тем же `state` в query.
3. **Callback** — `GET /api/integrations/yandex/callback`: проверяет подпись/срок `state` (код авторизации живёт 10 минут — успеть), извлекает `companyId` из `state` (**не из query/тела**) и сверяет его с `companyId` текущей cookie-сессии (совпадение обязательно — иначе редирект без действий; это не два независимых источника `companyId`, а defense-in-depth против утечки/повторного использования чужого `state`), обменивает `code` на токены (`POST https://oauth.yandex.com/token`, `grant_type=authorization_code`), best-effort запрашивает `login` (`GET https://login.yandex.ru/info?format=json`, `Authorization: OAuth <access_token>`; любая ошибка → `yandexLogin: null`, подключение всё равно завершается успешно), записывает `yandexAccessToken`/`yandexRefreshToken`/`yandexTokenExpiresAt`/`yandexLogin` на `Company` этой компании, пишет `EventType.YANDEX_CONNECTED`, редиректит на `/admin/integrations`.
4. **Отключение** — `DELETE /api/integrations/yandex` (ADMIN only) очищает все 4 поля, пишет `EventType.YANDEX_DISCONNECTED`.

**Callback — не NextAuth-провайдер.** Он не вызывает `signIn()` и не создаёт/не меняет NextAuth-сессию — опирается на уже существующую company-сессию из cookie (`auth()`), которая должна быть активна на момент возврата с oauth.yandex.ru (иначе — редирект на `/login`, попытка подключения теряется, администратор запускает флоу заново). Привязка к компании — через `companyId`, зашитый и проверенный в `state`, дополнительно сверенный с `companyId` текущей сессии.

**`authorize` и `callback` — вне `matcher` в `proxy.ts`** (не входит в список путей `/api/*`, которые proxy защищает) — оба роута делают проверку сессии/типа `kind: "company"` сами, в начале обработчика.

### Direct API v5 — параметры для реализации (Таск 2–3)

- **Base URL (production):** `https://api.direct.yandex.com/json/v5/{service}` (например, `.../campaigns`, `.../adgroups`, `.../keywords`).
- **Base URL (sandbox):** `https://api-sandbox.direct.yandex.com/json/v5/{service}` — изолированная тестовая среда с симулированными данными, не влияет на боевой кабинет; полезна для разработки Таска 3 без риска исчерпать units боевого лимита.
- **Авторизация запроса:** заголовок `Authorization: Bearer <access_token>` всегда. Заголовок `Client-Login: <логин клиента>` — **только** при агентском доступе (когда токен принадлежит представителю агентства, а не самому рекламодателю); при прямом доступе рекламодателя не добавляется.
- **Обмен кода на токен:** `POST https://oauth.yandex.com/token`, тело `application/x-www-form-urlencoded` — `grant_type=authorization_code`, `code`, `client_id`, `client_secret`.
- **Refresh:** тот же эндпоинт, `grant_type=refresh_token` + `refresh_token`; в ответе — новые `access_token` **и** новый `refresh_token` (ротация — старый `refresh_token` инвалидируется, сохранённое значение обязательно перезаписывать при каждом refresh, не только `access_token`).
- **TTL:** `expires_in` (секунды) приходит в каждом ответе токен-эндпоинта — не хардкодить константу, брать из ответа и пересчитывать `yandexTokenExpiresAt`. Официальная документация не называет фиксированный TTL как публичный контракт (рекомендация Яндекса — не полагаться на конкретное число, обновлять проактивно по `expires_in`/на 401).
- **Уровень доступа приложения:** *Trial* (только Sandbox) vs *Full* (Sandbox + управление боевыми кампаниями) — задаётся при регистрации/одобрении заявки на oauth.yandex.ru, не параметром запроса. Для Таска 3 нужен именно *Full*.
- **Лимиты (units):** каждый ответ содержит заголовок `Units: <потрачено>/<доступно>/<дневной лимит>` (пример: `Units: 10/20828/64000`) — если `enrichYandexLead` начнёт получать `429`/ошибку лимита, это укладывается в тот же фолбэк-no-op, что и остальные сбои (`.docs/modules/leads-intake.md` → «Фолбэк»), отдельной обработки не требует.

### Что переиспользуется в разделе «Экспорт квалификаций в Яндекс.Метрику» ниже

OAuth-инфраструктура **паттерна** (authorize/callback/refresh, server-only токены на `Company`, `state` HMAC на `AUTH_SECRET`) — общая для Директа и Метрики (Phase 22.5, раздел ниже), но **токен и OAuth-приложение не переиспользуются** — у Метрики свой `client_id`/`client_secret`/scope, зарегистрированные отдельно (см. ниже, почему).

---

## Экспорт квалификаций в Яндекс.Метрику (Phase 22.5)

> **Статус:** research завершён (Таск 1, 2026-07-17) — **GO**. Таск 2 (миграция + OAuth-флоу подключения счётчика + настройка `counterId`/цели) реализован. Движок экспорта и UI — Таски 3–4, кода пока нет. Полная бизнес-логика, решения и разбивка по таскам — `.docs/phases/phase-22.5.md`; итоги — `.docs/dev-log.md` → «Phase 22.5».

### Бизнес-цель

Интеграция с Яндексом до сих пор была только **входящей** (UTM/Полный режим — атрибуция «откуда пришёл лид»). Эта фаза добавляет **исходящий** канал: лиды, помеченные `Lead.qualification = QUALIFIED`, батчем по cron выгружаются в Яндекс.Метрику как офлайн-конверсии на одну цель — обучая алгоритмы Директа искать похожих. Экспорт **не влияет** на воронку, назначение, эскалацию, риск и саму квалификацию (Phase 11.6) — параллельный, необязательный канал; недоступность Метрики — тихий no-op, тот же принцип «лид нельзя потерять», примененный к экспорту.

### Отдельное OAuth-приложение, свой токен — не переиспользуется от Директа

Как и Директ (см. выше), но полностью независимо: своя заявка на oauth.yandex.ru (одна общая на все компании, не per-tenant), свой `client_id`/`client_secret`/scope. Причина не стилистическая: токен Директа минтится со `scope=direct:api` и физически не может вызвать Management API Метрики; плюс счётчик Метрики нередко живёт под другим аккаунтом Яндекса, чем рекламный кабинет Директа. Токены — server-only nullable-колонки `Company` (`metrikaAccessToken`, `metrikaRefreshToken`, `metrikaTokenExpiresAt`, `metrikaLogin`), **никогда** в `Company.settings` — та же причина, что у Директа: `toPublicSettings()` (`lib/settings/getSettings.ts`) стрипает из `GET /api/settings` только `roundRobinCursor`, любое другое поле `settings` ушло бы клиенту как есть.

### OAuth — что подтверждено research

- **Scope: `metrika:offline_data`** — «Uploading offline data (CRM data, offline conversions, calls) to tags». Точнее и уже, чем `metrika:write` (создание/изменение счётчиков — не нужен и не запрашивается). Подтверждено официальной документацией (`yandex.com/dev/metrika/en/intro/authorization`) **и** живой проверкой: запрос `GET https://oauth.yandex.ru/authorize?response_type=code&client_id=<реальный зарегистрированный client_id>&redirect_uri=<реальный redirect_uri>&scope=metrika:offline_data` дал чистый `HTTP 200` редирект на страницу логина Яндекс Паспорта (`<title>Log in</title>`), без `invalid_client`/`invalid_scope`/`unauthorized_client` в ответе — Яндекс принял и `client_id`, и `redirect_uri`, и именно этот scope для уже зарегистрированного приложения.
- **Модерации доступа нет (в отличие от Директа).** У Метрики нет отдельной «заявки на доступ к API» с рассмотрением до 7 дней — регистрации OAuth-приложения с нужным scope достаточно, API работает сразу после первого обмена токена.
- **Redirect URI** = `APP_URL + /api/integrations/yandex/metrika/callback` — отдельный путь от Директа (`/api/integrations/yandex/callback`).
- **Authorize URL** (Таск 2, `GET /api/integrations/yandex/metrika/authorize`, ADMIN, минтит `state` в момент запроса — не при рендере страницы): `https://oauth.yandex.ru/authorize?response_type=code&client_id=YANDEX_METRIKA_OAUTH_CLIENT_ID&redirect_uri=YANDEX_METRIKA_OAUTH_REDIRECT_URI&scope=metrika:offline_data&state=<подписанный>`. `state` — тот же паттерн, что у Директа (`lib/integrations/yandex/oauth.ts` → зеркалится в `metrikaOauth.ts`): HMAC-SHA256 на `AUTH_SECRET`, payload `{companyId, ts, nonce}`, TTL 10 минут (код авторизации Яндекса живёт 10 минут — общий OAuth-движок Яндекс Паспорта, тот же, что у Директа).
- **Обмен кода на токен / refresh** — тот же общий эндпоинт Яндекс Паспорта, не специфичен для Метрики: `POST https://oauth.yandex.com/token`, `grant_type=authorization_code` (`code`/`client_id`/`client_secret`) и `grant_type=refresh_token` (`refresh_token`/`client_id`/`client_secret`); ответ содержит **новый** `access_token` **и новый** `refresh_token` при каждом refresh — ротация, оба поля перезаписываются, `expires_in` берётся из ответа, не хардкодится.
- **`login` (best-effort)** — тот же `GET https://login.yandex.ru/info?format=json`, `Authorization: OAuth <access_token>`, что у Директа; любая ошибка → `metrikaLogin: null`, подключение всё равно завершается успешно.
- **Callback — не NextAuth-провайдер**, `authorize`/`callback` вне `matcher` `proxy.ts`, `companyId` привязки — из `state`, сверяется с `companyId` сессии — идентично Директу (см. выше).

### Management API — `offline_conversions/upload`

Подтверждено официальной документацией Яндекса (`yandex.com/dev/metrika/en/management/offline-conv`, `yandex.ru/dev/metrika/doc/api2/management/offline_conversion/upload.html`, `yandex.com/support/metrica/en/data/offline-conversion-data.html`).

- **Endpoint:** `POST https://api-metrika.yandex.net/management/v1/counter/{counterId}/offline_conversions/upload?client_id_type=<CLIENT_ID|YCLID>`
- **Авторизация:** заголовок `Authorization: OAuth <access_token>` — **не** `Bearer`, в отличие от Direct API v5 (см. выше). Разный формат заголовка у двух API одного вендора — не опечатка, при реализации `metrikaApi.ts` не копировать буквально из `directApi.ts`.
- **`client_id_type` — query-параметр, определяет тип идентификатора для всего запроса целиком, не поле внутри CSV.** Значения — `CLIENT_ID` (обычный визит с сайта, `ClientId` из cookie Метрики) или `YCLID` (клик по объявлению Директа). **Один запрос = один тип идентификатора: смешивать `ClientId`- и `Yclid`-строки в одной загрузке нельзя.** Для батча лидов, часть которых имеет `ClientID`, а часть — `yclid`, движок экспорта (Таск 3) обязан разбить выборку на две группы и сделать **до двух отдельных запросов за прогон** — по одному на каждый встретившийся `client_id_type`, с соответствующей CSV-колонкой.
- **Тело запроса:** `multipart/form-data`, единственное поле `file` — CSV-файл, UTF-8, макс. 1 ГБ.
- **Колонки CSV** (заголовок в первой строке):
  - `ClientId` **или** `Yclid` (ровно одна из двух — та, что соответствует `client_id_type` этого запроса) — обязательна.
  - `Target` — обязательна, идентификатор цели (см. ниже).
  - `DateTime` — обязательна, Unix-время конверсии в секундах, не может быть в будущем.
  - `Price` — опционально, десятичный разделитель — точка.
  - `Currency` — опционально, ISO 4217 (например `RUB`).
  - (`UserId`/`PurchaseId` — третий/четвёртый тип идентификатора из API Метрики, в Лид-Канале не используются: у лида нет собственного `UserId`, `PurchaseId` — под e-commerce-сценарии.)
- **Семантика `Target` — не числовой `goalId`, а строковый идентификатор.** Администратор счётчика вручную создаёт в Метрике цель типа **«JavaScript-событие»** (Метрика → «Цели» → «Добавить цель» → тип «JavaScript-событие» → поле «Идентификатор»; допустимы только латиница/цифры, без `/ \ & # ? =` и пробелов — например `qualified_lead`) **до** первой выгрузки: `offline_conversions/upload` не создаёт цели на лету, несуществующий `Target` — не сопоставится (`LINKAGE_FAILURE`). Для Таска 2 это значит: `Company.settings.yandexMetrika.qualifiedGoalId` хранит именно эту строку, вводит её вручную администратор/маркетолог при настройке (симметрично `counterId`) — валидировать существование цели через API на этапе сохранения настройки нельзя (Метрика Management API не отдаёт список JS-событийных целей отдельным вызовом, который стоило бы городить ради этого), ошибка обнаружится только при первой реальной выгрузке.
- **Ответ (200 OK):** JSON `{ uploading: { id, create_time, source_quantity, line_quantity, comment, type, client_id_type, status } }`. `status` проходит `PREPARED → UPLOADED → EXPORTED → MATCHED → PROCESSED` (или `LINKAGE_FAILURE`). Данные появляются в отчётах Метрики **до 2 часов** после загрузки — синхронно узнать успех сопоставления по ответу `upload` нельзя, только асинхронно опросив `uploading.status` отдельным вызовом. **Таск 3 не опрашивает статус** — экспорт fire-and-forget с точки зрения сопоставления (симметрично тому, как приём лидов не ждёт подтверждения от внешних систем); `metrikaExportedAt` фиксирует факт **успешной отправки** (`200 OK` от `upload`), не факт **сопоставления** визита.
- **Лимиты:** явного лимита строк/запросов в день официальная документация не публикует — единственный документированный лимит: размер файла (1 ГБ). Укладывается в общий фолбэк-no-op (тот же принцип, что у исчерпания `units` Direct API).

### Окно атрибуции — 21 день, и оно не включено по умолчанию

- По умолчанию Метрика допускает дозапись данных о визите (включая офлайн-конверсию) только в течение **16 часов** после его завершения.
- Чтобы окно расширилось до **21 дня**, администратор счётчика должен вручную включить в самой Метрике чекбокс **«Увеличенный период учёта конверсий»** (счётчик → «Настройка» → блок загрузки офлайн-конверсий) — это настройка на стороне Метрики, не нашего продукта, включается один раз для счётчика.
- **Ловушка, которую нужно явно сказать клиенту (Таск 4):** расширение **не ретроактивно** — действует только для визитов, зарегистрированных в Метрике **после** включения чекбокса. Если клиент включит его только в момент подключения интеграции, все визиты до этого момента останутся на 16-часовом окне — их офлайн-конверсии никогда не сопоставятся, даже если лид качественный. Инструкция должна прямо рекомендовать включить чекбокс заранее, не откладывать.
- 21 день отсчитывается от **последнего визита пользователя** до **начала обработки файла**, не от момента квалификации лида. Cron-батч (решение зафиксировано в `phase-22.5.md`, не событийный триггер) не может гарантировать попадание в окно для лида, квалифицированного спустя много дней после визита — осознанный компромисс продукта, не баг реализации.

### Источник идентификатора у лида

- **`yclid`** уже сохраняется в `Lead.marketing.yclid` для всех лидов (Phase 22, `MARKETING_FIELDS`/`constants/fieldAliases.ts`) — из вебхука или обогащения Direct API, дополнительного кода приёма не требуется.
- **`ClientID`** — новый источник, которого сейчас нет ни в одном канале приёма. Как и остальные ID-макросы Директа (Phase 22, `constants/yandexMacros.ts`), это скрытое поле HTML-формы на стороне сайта клиента (стандартно заполняется через `ym(counterId, 'getClientID', callback)` из сниппета Метрики) — вне нашего контроля; ожидаемое имя поля — `client_id` (конвенция проекта: «имя без обёртки», как у `yandexMacros.ts`), попадает в `Lead.customFields.client_id` через уже существующий `normalizeLead()` без нового кода приёма. Инструкция клиенту — Таск 4, по образцу уже существующей инструкции по скрытым полям Директа (коммит `4b1116b`).
- Хелпер извлечения (Таск 3, `lib/integrations/yandex/metrikaExport.ts`) читает оба источника на лида: `Lead.customFields.client_id` и `Lead.marketing.yclid`. Если есть оба — не проблема двойной отправки: выгрузка всё равно идёт батчем с разбивкой по `client_id_type` (см. выше), каждый лид в конкретном прогоне относится ровно к одной из двух групп (приоритет — `yclid`, как более точная привязка к рекламному клику, если есть оба).
- **Лид без обоих идентификаторов — тихий пропуск, не ошибка.** Это штатное большинство лидов (ручной ввод, импорт CSV/Excel, сайт без Метрики, форма без скрытого поля) — не редкий сбой API, который нужно логировать как fallback. `metrikaExportedAt` остаётся `null` навсегда для такого лида: не считается ошибкой, не ретраится (идентификатора никогда не появится).

### ENV (согласовано для Таска 2)

```
YANDEX_METRIKA_OAUTH_CLIENT_ID=
YANDEX_METRIKA_OAUTH_CLIENT_SECRET=
YANDEX_METRIKA_OAUTH_REDIRECT_URI=<APP_URL>/api/integrations/yandex/metrika/callback
```

Отдельные от `YANDEX_OAUTH_*` (Директ) — своё приложение, свой scope; уже добавлены в `.env` (research выполнялся с реальными значениями).

### Файлы (Таски 2–4, пути выровнены под уже существующие `lib/integrations/yandex/*`)

```
lib/integrations/yandex/
├── oauth.ts                # существует (Директ) — не трогать
├── directApi.ts            # существует (Директ) — не трогать
├── metrikaOauth.ts         # НОВОЕ (Таск 2) — buildAuthorizeUrl/verifyState/exchangeCodeForTokens/refreshAccessToken/saveMetrikaTokens/disconnectMetrika/getMetrikaConnectionStatus, зеркалит oauth.ts
├── metrikaApi.ts           # НОВОЕ (Таск 3) — тонкий клиент offline_conversions/upload; Authorization: OAuth <token> (не Bearer); авто-refresh на 401
└── metrikaExport.ts        # НОВОЕ (Таск 3) — exportQualifiedLeads(companyId): выборка QUALIFIED без metrikaExportedAt → группировка по client_id_type → до 2 запросов за прогон → идемпотентность

app/api/integrations/yandex/metrika/
├── route.ts                # НОВОЕ (Таск 2) — GET статус / PATCH counterId+qualifiedGoalId / DELETE отключение
├── authorize/route.ts      # НОВОЕ (Таск 2) — GET, минтит state, 302 на oauth.yandex.ru
├── callback/route.ts       # НОВОЕ (Таск 2) — GET, обмен code→токены, редирект
└── cron/route.ts           # НОВОЕ (Таск 3) — POST, CRON_SECRET, вызывает exportQualifiedLeads для каждой подключённой компании
```

Полная разбивка по таскам, миграция, DoD — `.docs/phases/phase-22.5.md`.

---

## Универсальный Webhook — API-ключи

Генерация (криптостойкая), хэширование, показ один раз. Каждый созданный ключ автоматически получает соответствующую запись в `IntegrationSource` (или она создаётся лениво при первом успешном приёме — см. `.docs/modules/leads-intake.md` → `touchIntegrationSource`). Каждый ключ создаётся включённым (`isEnabled: true`) — см. «Тумблер включения источника» выше.

---

## Статус здоровья источников

### Отображение (FR-163)

На той же странице `/admin/integrations`, под каждой карточкой источника — индикатор:

```
🟢 Активен — последняя заявка 12 минут назад
🟡 Молчит 2 часа (порог: 3 часа) — пока не алерт, но видно заранее
🔴 Не передаёт заявки 5 часов — отправлен алерт Руководителю и Администратору
⚪ Не настроено — нет ни одной заявки с этого источника
⛔ Выключен — администратор отключил источник, вебхук отклоняет заявки
```

Источник данных — `IntegrationSource.lastUsedAt`/`lastErrorAt`/`errorCount`. Логика алерта (когда именно красный статус превращается в Telegram-сообщение) — `.docs/modules/notifications.md` → «Мониторинг источников», этот модуль только отображает.

---

## API-эндпоинты

| Метод           | Путь                             | Назначение                                       | Auth    | Право              |
| --------------- | -------------------------------- | ------------------------------------------------ | ------- | ------------------ |
| GET             | `/api/settings/webhook-urls`     | URL вебхуков                                     | Session | ADMIN only         |
| GET/POST/DELETE | `/api/api-keys`                  | Управление ключами универсального webhook        | Session | ADMIN only         |
| PATCH           | `/api/api-keys/:id`              | Включить/выключить конкретный ключ (`isEnabled`) | Session | ADMIN + маркетолог |
| PATCH           | `/api/settings`                  | В т.ч. `sourceEnabled: { tilda?, wordpress? }`   | Session | ADMIN only         |
| GET             | `/api/admin/integrations/health` | Статус здоровья всех источников компании         | Session | ADMIN only         |
| GET/DELETE      | `/api/integrations/yandex`       | Статус подключения (`GET`, JSON) / отключение (`DELETE`) | Session | ADMIN only         |
| GET             | `/api/integrations/yandex/authorize` | Минтит `state`, 302 на `oauth.yandex.ru/authorize` | Session | ADMIN only         |
| GET             | `/api/integrations/yandex/callback` | OAuth callback — обмен `code`→токены, редирект | Session (cookie) + `state` | ADMIN only (владелец `companyId` из `state`, сверенный с сессией) |
| GET/PATCH/DELETE | `/api/integrations/yandex/metrika` | Статус (`GET`) / настройка `counterId`+`qualifiedGoalId` (`PATCH`) / отключение (`DELETE`) | Session | `GET`/`DELETE` — ADMIN only; `PATCH` — ADMIN + маркетолог |
| GET             | `/api/integrations/yandex/metrika/authorize` | Минтит `state`, 302 на `oauth.yandex.ru/authorize` | Session | ADMIN only |
| GET             | `/api/integrations/yandex/metrika/callback` | OAuth callback Метрики — обмен `code`→токены, редирект | Session (cookie) + `state` | ADMIN only (владелец `companyId` из `state`, сверенный с сессией) |

**Маркетолог и статус Яндекса:** страница `/admin/integrations` отдаёт `connected`/`login` серверным пропом (тот же паттерн, что webhook-URL, Phase 18) — маркетолог видит статус кабинета в режиме чтения без отдельного API-запроса. Новый пункт в `constants/marketerAccess.ts` под это **не добавляется**: маркетолог не может ни подключить, ни отключить кабинет (как и `yandexMode`), а GET-статус ему не нужен отдельным эндпоинтом.

---

## Файлы, которые создаются

```
app/
├── (admin)/admin/integrations/page.tsx
└── api/
    ├── settings/webhook-urls/route.ts
    ├── api-keys/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── admin/integrations/health/route.ts
    └── integrations/yandex/
        ├── route.ts            # GET статус (JSON) / DELETE отключение
        ├── authorize/route.ts  # GET — минтит state, 302 на oauth.yandex.ru (свой guard)
        └── callback/route.ts   # GET OAuth callback, свой guard (вне matcher proxy.ts)

components/admin/integrations/
├── TildaCard.tsx
├── WordpressCard.tsx
├── YandexCard.tsx
├── ApiKeysList.tsx
├── CreateApiKeyModal.tsx
└── SourceHealthIndicator.tsx   # 🟢🟡🔴⚪
```

> Список выше — черновой, фактические пути (`components/integrations/*`) см. в `CLAUDE.md` → «Архитектура». Тумблер включения (v4.2) добавил `components/integrations/WebhookSourceCard.tsx` (Tilda/WordPress, клиентский, реиспользует `IntegrationCard`) — отдельного файла для тумблера API-ключей нет, он встроен в `ApiKeysTable.tsx`.

---

## Серверные правила безопасности

1. **Управление интеграциями — только `ADMIN`.** Ни Руководитель, ни Менеджер не создают/удаляют/включают источники. Исключение — маркетолог внутри своих компаний (allow-list, `constants/marketerAccess.ts`): он уже полностью управляет API-ключами (создание/удаление), поэтому и тумблер конкретного ключа (`PATCH /api/api-keys/:id`) ему тоже доступен; тумблер Tilda/WordPress лежит в `Company.settings` и остаётся ADMIN-only (`PATCH /api/settings` не принимает сессию маркетолога) — маркетолог видит его состояние, но не переключает, как и `yandexMode`.
2. **API-ключ хэшируется**, plain-значение показывается клиенту один раз и не логируется.
3. **`companyId` в URL вебхуков — только для приёма**, не для аутентификации UI-запросов (UI всегда берёт `companyId` из сессии).
4. **Здоровье источников — read-only**, не редактируется напрямую — это производные данные от `touchIntegrationSource`, не настройка. Тумблер включения — отдельная настройка, не часть здоровья, хотя и влияет на отображаемый статус (`disabled`).
5. **Выключенный источник отклоняет вебхук на входе** (`403 SOURCE_DISABLED`), лид не создаётся — единственное намеренное исключение из «лид нельзя потерять» в этом продукте, см. `CLAUDE.md` и раздел «Тумблер включения источника» выше.
6. **Токены Яндекса — server-only, никогда через `Company.settings`.** Nullable-колонки `Company` (`.docs/database.md`), не JSONB `settings` — `toPublicSettings()` не стрипает произвольные поля `settings`, только `roundRobinCursor`, значит токен в `settings` утёк бы клиенту через `GET /api/settings`. Ни один эндпоинт (включая `GET /api/integrations/yandex`) не возвращает сами токены — только производный статус `connected`/`login`.
7. **OAuth callback — не в `matcher` `proxy.ts`, guard делает роут сам.** Проверяет company-сессию (`kind: "company"`) из cookie и валидность/подпись `state` (CSRF) до обмена `code` на токены; `companyId` привязки берёт только из `state`, никогда из query/тела запроса.

---

## Связи с другими модулями

- **`.docs/modules/leads-intake.md`** — реальный приём по этим вебхукам; `touchIntegrationSource`.
- **`.docs/modules/notifications.md`** — алерт о замолчавшем источнике, использует те же данные `IntegrationSource`.
- **`.docs/modules/app-settings.md`** — `sourceHealthThresholdHours`, `yandexMode`.
- **`.docs/database.md`** — `ApiKey`, `IntegrationSource`.
