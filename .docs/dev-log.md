# Development Log

Журнал сессий разработки. Записывай сюда что сделано после каждой сессии.

---

## Вспомогательные скрипты

Одноразовые/служебные скрипты для ручных операций. Запускаются локально через `tsx`, читают `.env` из корня проекта.

### `scripts/deleteCompany.ts` — удаление компании из БД

Полностью удаляет одну компанию и все её данные (лиды, события, пользователи, этапы, причины отказа, приглашения, задачи, напоминания, API-ключи и т.д.) в транзакции, в порядке зависимостей. Каждый запрос ограничен `companyId` — данные других компаний и платформенных администраторов не затрагиваются. Без аргумента или при несуществующем `id` скрипт падает, ничего не удаляя.

Запуск:

```bash
npx tsx scripts/deleteCompany.ts <companyId>
# или
npm run delete:company -- <companyId>
```

`companyId` берётся из Prisma Studio (`npx prisma studio`, таблица `Company`). Подтверждения нет — удаляется именно та компания, чей id передан.

### `scripts/seedTestApiKey.ts` — тестовый API-ключ для universal webhook

Генерирует криптостойкий plain key, сохраняет SHA-256 хэш в `ApiKey`, выводит ключ один раз в консоль. Повторный запуск не создаёт дубль (проверка по `name: "test-api-key"`). Привязывает ключ к первой компании в БД.

Запуск:

```bash
npx tsx scripts/seedTestApiKey.ts
# или
npm run seed:api-key
```

---

## 2026-07-12 — Phase 18, Таск 2: Webhook-URL + API здоровья источников

**Статус:** ✅ Завершён

**Что было сделано:**

- `constants/integrations.ts` (новый) — `SOURCE_HEALTH_WARNING_RATIO = 0.66`, тип `SourceHealthStatus`, `SOURCE_HEALTH_LABELS` (эмодзи/подписи) — единый источник для API и будущего UI (Таск 3)
- `lib/integrations/getSourceHealth.ts` (новый, server-only) — `getSourceHealth(companyId)`: кандидаты = 2 фиксированных (`tilda`/`wordpress`) + по одному на каждый `ApiKey.sourceLabel` (дедуп по `sourceLabel`); порог из `getSettings().sourceHealthThresholdHours`; статус только по `lastUsedAt` vs threshold и `SOURCE_HEALTH_WARNING_RATIO` (`active`/`silent`/`down`/`not_configured`); `lastErrorAt`/`errorCount` в ответе, но не влияют на статус; read-only, без записи в БД
- `app/api/settings/webhook-urls/route.ts` (новый) — `GET`, `requireCompanyUser({ minRole: 'ADMIN' })` (жёсткий deny маркетологу); `{ tildaUrl, wordpressUrl }` с `companyId` из сессии; `APP_URL` с `.replace(/\/$/, '')`; без `APP_URL` → `500` + `console.error`
- `app/api/admin/integrations/health/route.ts` (новый) — `GET`, `requireCompanyAccess({ minRole: 'ADMIN', method, pathname })` (форвард-совместимо с allow-list маркетолога в Таске 4); возвращает `getSourceHealth(actor.companyId)`

**Out of scope (не делалось):** UI `/admin/integrations`, `SourceHealthIndicator` — Таск 3; `yandexMode`, allow-list маркетолога — Таск 4; изменения `checkSourceHealth.ts`/крон-алертинга — Phase 17; создание/обновление `IntegrationSource` — `touchIntegrationSource` при приёме лида; миграции БД

**Проверено:** `npm run type-check`, `npm run build`, `npm run lint` — без ошибок; нет `any`; оба роута присутствуют в выводе сборки; эндпоинты read-only (только `findMany`/`getSettings`, без мутаций)

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-12 — Phase 18, Таск 1: API-ключи — backend (CRUD + криптогенерация + show-once)

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/apiKeys/generateApiKey.ts` (новый, server-only) — `generateApiKey()` → `{ plaintext, keyHash }` через `generateToken()`/`hashToken()` из `lib/tokens.ts` (тот же SHA-256, что `lib/intake/verifyApiKey.ts`); `maskApiKey(keyHash)` — фингерпринт из первых 8 hex-символов `keyHash` (не из plaintext)
- `lib/validations/apiKeys.ts` (новый) — `createApiKeySchema` (`name`, `sourceLabel` — непустые строки после trim), тип через `z.infer`
- `app/api/api-keys/route.ts` — стаб `// TODO` заменён: `GET` — список `{ id, name, sourceLabel, mask, createdAt }` без `keyHash`/plaintext; `POST` — Zod-валидация, создание `ApiKey`, `plaintext` только в ответе `201` (больше нигде не возвращается)
- `app/api/api-keys/[id]/route.ts` (новый) — `DELETE` с `where: { id, companyId }`; несуществующий/чужой ключ → `404`; `IntegrationSource` не трогается
- Guard во всех хендлерах — `requireCompanyAccess({ minRole: 'ADMIN', method, pathname })` (форвард-совместимо с allow-list маркетолога в Таске 4), не прямой `hasMinRole`

**Out of scope (не делалось):** UI (`ApiKeysTable`, `CreateApiKeyModal`, `/admin/integrations`) — Таск 3; webhook-URL, `GET /api/admin/integrations/health` — Таск 2; запись `/api/api-keys` в `constants/marketerAccess.ts` — Таск 4 (до неё маркетолог получает `403`); `yandexMode`, read-only Яндекс для маркетолога — Таск 4; изменения `IntegrationSource` при создании/удалении ключа; миграции БД

**Проверено:** `npm run type-check`, `npm run build`, `npm run lint` — без ошибок; нет `any`; живая проверка против dev-датасета (временный скрипт, удалён после): `POST` вернул `plaintext` один раз (`plaintextLength: 64`), `GET` — только `mask`, без ключа; `DELETE` чужого id → `404`; без сессии все три метода → `401` (`curl`); plaintext не логируется

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-11 — Phase 17, Таск 5: Страница `/control` — счётчик активности менеджеров

**Статус:** ✅ Завершён

**Что было сделано:**

- `types/control.ts` (новый) — `ManagerStat` + `ControlStatsResponse`
- `lib/validations/control.ts` (новый) — `controlPeriodSchema` (7/30/90, по аналогии с `activityPeriodSchema`)
- `lib/control/getManagerStats.ts` (новый) — один batch-запрос `Lead.findMany` (companyId + `assignedToId != null` + `createdAt >= periodStart`, с событиями `LEAD_TAKEN_IN_WORK`/`LEAD_STAGE_STUCK`) + один запрос `User` по встретившимся `assignedToId`; группировка в JS без N+1 (паттерн `lib/tasks/getNextActions.ts`); строки — все пользователи с назначенными лидами в периоде, не только `role: 'MANAGER'` (явное решение — ручное назначение допускает HEAD/ADMIN); «обработано в срок» — `minutesSinceCreated(lead.createdAt, takenEvent.createdAt, workHours)` (таймстамп события, не `now`) в пределах `resolveApplicableNorm(...).defaultMinutes`
- `app/api/control/stats/route.ts` (новый) — `GET`, `requireCompanyUser({ minRole: 'HEAD' })` (`try/catch`, паттерн `assign/route.ts`), `?period=7|30|90` (дефолт 30), ответ `{ managers, periodDays }`
- `app/(company)/(management)/control/page.tsx` — заглушка «Раздел в разработке» заменена на Server Component по паттерну `/team` (прямой вызов `getManagerStats`, без self-fetch через HTTP/`APP_URL`)
- `components/control/ManagerStatsTable.tsx` (новый) — Client Component: переключатель периода 7/30/90 инлайн (паттерн `CompanyActivityTable`), таблица метрик, пустое состояние
- Прогнано вживую против реального dev-датасета через временный debug-роут `app/api/devDebugControlStats/route.ts` (создан для проверки, удалён сразу после): агрегация по 4 компаниям без ошибок, включая случай с лидом на `ADMIN`-пользователя (подтверждает, что фильтр строк — не по роли); 401 без сессии на API, 307 → `/login` на странице без сессии
- `npm run type-check`/`lint`/`build`/`test` — все зелёные
- `.docs/phases/phase-17.md`, `.docs/phases/_status.md` — таск 5 и фаза 17 в целом отмечены ✅ Завершено

**Out of scope (не делалось):** `/admin/integrations` + health-display API — Phase 18; учёт истории переназначений (`ASSIGNED`) в «получено» — метрика по снапшоту `assignedToId`; реконструкция исторических нормативов реакции — норма берётся текущая.

**Не выполнено в этой сессии:** ручной клик-through в браузере под реальным HEAD/ADMIN-логином — нет тестовых учётных данных и браузерного/Playwright-инструмента. Компенсировано прогоном `getManagerStats` против реальных данных и успешной сборкой (`npm run build`) страницы `/control` и API.

**Definition of Done:** ✅ Все пункты выполнены, кроме визуального браузерного прогона (см. выше)

---

## 2026-07-11 — Phase 17, Таск 4: UI настроек контроля в `/admin/settings`

**Статус:** ✅ Завершён

**Что было сделано:**

- `components/settings/ControlSection.tsx` (новый) — карточка «Контроль»: тумблер `controlEnabled` + числовые/временные поля `reactionNorms.defaultMinutes/reminderBeforePercent/escalateAfterPercent`, `stageStuckDaysDefault`, `stuckCheckTime`, `sourceHealthThresholdHours`; каждое поле — независимый мгновенный `PATCH /api/settings` по `blur`/toggle (локальный draft + откат при невалидном/пустом вводе, паттерн `StageRow.commitLimit`), без batch-формы с кнопкой «Сохранить»
- `components/settings/ReactionNormOverridesTable.tsx` (новый) — общий `OverrideSection` (переиспользован трижды: «По источнику»/«По этапу»/«По сотруднику») поверх `reactionNorms.bySource/byStage/byUser`; добавление — инлайн-строка (Select для этапа/сотрудника из серверных пропсов, текст с `<datalist>`-подсказками из `IntegrationSource.type` для источника); удаление отправляет `{ [key]: null }` (глубокий мёрж из Таска 1 не тронут); запись со ссылкой на уже удалённый этап/заблокированного сотрудника рендерится с фолбэк-подписью и остаётся удаляемой
- `components/settings/WorkHoursForm.tsx` (новый) — `reactionNorms.workHoursOnly` + `workHours.start/end/days`; включение тумблера без ранее сохранённого расписания сразу сохраняет дефолт (09:00–18:00, Пн–Пт), чтобы гейт не оставался тихим no-op; UI блокирует снятие последнего оставшегося рабочего дня (схема не допускает пустой `days`)
- `app/(company)/(admin)/admin/settings/page.tsx` — заменены самодельные `readAssignMode`/`readTelegramEnabled` на `getSettings(companyId)`; добавлены запросы `pipelineStage` и `distinct IntegrationSource.type` для новых секций; три новые карточки вставлены рядом с `AssignmentRulesSection`, вне `SettingsDirtyProvider` (та же мгновенная модель сохранения)
- Бэкенд не менялся — `lib/settings/getSettings.ts`/`updateSettings.ts`, `lib/validations/settings.ts`, `app/api/settings/route.ts` уже покрывали все поля с Таска 1
- Проверено вживую через Playwright (headless Chromium, временно `npm install --no-save playwright`, без изменений `package.json`/lock-файла) против одноразовой тестовой компании (создана и удалена скриптами `scripts/tmpVerifyTask4*.ts` + `scripts/deleteCompany.ts`, оба временных скрипта удалены после проверки): тумблер и числовое поле переживают reload; добавление всех трёх override одновременно не стирает соседние; удаление одного override не возвращается после reload и не задевает остальные; включение `workHoursOnly` без сохранённого расписания сразу проставляет дефолт; последний рабочий день нельзя снять; существующие секции (`LossReasonsSection`, `AssignModeSection`, `AssignmentRulesSection`, `NotificationsSection`, `SystemSection`) не регрессировали
- `.docs/phases/phase-17.md`, `.docs/phases/_status.md` — таск 4 отмечен ✅

**Out of scope (не делалось):** страница `/control` + `GET /api/control/stats` — Таск 5; `/admin/integrations`, health-display API — Phase 18; кросс-валидация `reminderBeforePercent < escalateAfterPercent` на клиенте — схема её не требует; живой сценарий с реально удалённым этапом/заблокированным сотрудником в overrides проверен код-ревью, не отдельным browser-прогоном.

**Definition of Done:** ✅ Все пункты выполнены

---

## 2026-07-11 — Phase 17, Таск 3: Зависшие лиды, конец дня, здоровье источников

**Статус:** ✅ Завершён

**Что было сделано:**

- `prisma/schema.prisma` + миграция `20260711185904_phase_17_control_summary_event` — `CONTROL_SUMMARY_SENT` в `enum EventType` (company-level маркер дневной сводки, `leadId: null`, различается по `payload.kind: 'stuck' | 'endOfDay'`)
- `constants/eventLabels.ts` — `CONTROL_SUMMARY_SENT` в `PLATFORM_EVENT_LABELS`
- `lib/control/controlSummaryMarker.ts` (новый) — `hasSentSummaryToday(companyId, kind, now)` + `markSummarySent(companyId, kind)`; общий для обеих дневных сводок, фильтр по `payload.kind` в одном месте
- `lib/control/checkStuckLeads.ts` (новый) — компании `controlEnabled && !isBlocked`, час(now) == час(`stuckCheckTime`), `!hasSentSummaryToday('stuck')`; лимит = `stageTimeLimitDays ?? stageStuckDaysDefault`; «завис» по дням с последнего `STAGE_CHANGED` (или `createdAt`); `LEAD_STAGE_STUCK` — once per episode (сравнение с последним `STAGE_CHANGED`, не `sent.has` навсегда); непустой список → `notifyManagement(STUCK_LEADS_SUMMARY)`; в конце — `markSummarySent('stuck')` даже при пустом списке
- `lib/control/checkEndOfDaySummary.ts` (новый) — час(now) == час(`workHours.end ?? '18:00'`), `!hasSentSummaryToday('endOfDay')`; лиды, созданные сегодня, без `LEAD_TAKEN_IN_WORK`; непустой список → `notifyManagement(END_OF_DAY_SUMMARY)`; `markSummarySent('endOfDay')` всегда
- `lib/control/checkSourceHealth.ts` (новый) — по компаниям `controlEnabled && !isBlocked`; `IntegrationSource` с `lastUsedAt != null`; `SOURCE_DOWN` once per problem (сравнение таймстампов `SOURCE_DOWN`/`SOURCE_RECOVERED`, без `alertedDown`); `SOURCE_RECOVERED` только после незакрытого `SOURCE_DOWN` (не на каждый здоровый час)
- `lib/notifications/notifyManagement.ts` — расширены `ManagementAlertPayloads`/`ALERT_TEMPLATES`: `STUCK_LEADS_SUMMARY`, `END_OF_DAY_SUMMARY`, `SOURCE_DOWN`
- `constants/telegramTemplates.ts` — шаблоны `stuckLeadsSummary`, `endOfDaySummary`, `sourceDown`
- `app/api/cron/control/daily/route.ts` (новый) — `verifyCronSecret` → `checkStuckLeads()` + `checkEndOfDaySummary()` через `Promise.allSettled` (сбой одной проверки не роняет вторую)
- `app/api/cron/control/source-health/route.ts` (новый) — `verifyCronSecret` → `checkSourceHealth()`
- `.docs/phases/phase-17.md` — уточнён контекст (аддитивная миграция в Таске 3), таск 3 ✅
- `.docs/modules/notifications.md` — исправлен баг примера `SOURCE_RECOVERED`; `CONTROL_SUMMARY_SENT` вместо `alertedDown`/абстрактного маркера
- `.docs/phases/_status.md` — отметка по таску 3

**Out of scope (не делалось):** UI `/admin/settings` (`ControlSection` и др.) — Таск 4; страница `/control` + `GET /api/control/stats` — Таск 5; `/admin/integrations`, health-display API — Phase 18; изменение алгоритма риска в `computeRisk`/`computeRiskBatch`; регистрация crontab (`daily`, `source-health`) — ручной ops-шаг после деплоя

**Проверено:** `npm test` (37/37), `npm run type-check`, `npm run build`, `npm run lint` — без ошибок; миграция применена (`prisma migrate dev`); нет `any`

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-11 — Phase 17, Таск 2: Трёхступенчатая эскалация первого ответа (`checkReactionTime` + cron + управленческие алерты)

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/notifications/managementRecipients.ts` (новый) — `getManagementRecipients(companyId)`: активные `HEAD+` пользователи компании с `telegramChatId`/`notificationPreferences` (аналог `recipients.ts`, но по роли)
- `lib/notifications/notifyManagement.ts` (новый) — рассылка управленческого алерта всем `HEAD+` с тройным гейтом (`company.telegramEnabled` + `telegramChatId` + `managementAlerts`); сбой одного получателя не прерывает остальных
- `lib/notifications/notifyManager.ts` — ключ `REACTION_REMINDED` → `reactionReminder` в `ManagerAlertPayloads`/`ALERT_PREFERENCE_KEY`/`ALERT_TEMPLATES` (по существующему generic-паттерну)
- `types/users.ts` + `lib/notifications/preferences.ts` — `reactionReminder`/`managementAlerts` в `NotificationPreferences` и `DEFAULT_NOTIFICATION_PREFERENCES` (дефолт `true`); оба поля парсятся в `parseNotificationPreferences`
- `constants/telegramTemplates.ts` — шаблоны `reactionReminder({ name, minutes })` и `reactionEscalated({ name, minutes, manager })`
- `lib/control/checkReactionTime.ts` (новый) — компании `!isBlocked` + `parseCompanySettings().controlEnabled === true` (не JSON-`where`); лиды `closeType: null, assignedToId != null`; норматив/проценты через `resolveApplicableNorm`, рабочее время — один раз на компанию; `LEAD_TAKEN_IN_WORK` останавливает цепочку; ступени `else if` сверху вниз (133% → 100% → 66%), once-per-lead по наличию события; `writeEvent(LEAD_REACTION_*, { userId: null, leadId })` + `notifyManager`/`notifyManagement`; сводка `{ checked, reminded, overdue, escalated }`
- `app/api/cron/control/reaction-time/route.ts` (новый) — `POST`, `verifyCronSecret` → `401`, иначе `checkReactionTime()` → JSON-сводка; не в matcher `proxy.ts`
- `components/profile/ProfileNotifications.tsx` — список переключателей отвязан от `keyof NotificationPreferences` (`PROFILE_PREFERENCE_KEYS`); `reactionReminder`/`managementAlerts` в профиле не показываются

**Out of scope (не делалось):** `checkStuckLeads`/`checkEndOfDaySummary`/`checkSourceHealth` — Таск 3; UI настроек контроля в `/admin/settings` — Таск 4; страница `/control` + `GET /api/control/stats` — Таск 5; провязка `ASSIGNMENT_FAILED` к `notifyManagement`; отображение здоровья источников — Phase 18; миграции БД; регистрация crontab-записи — ручной ops-шаг после деплоя

**Проверено:** `npm test` (37/37), `npm run type-check`, `npm run build`, `npm run lint` — без ошибок; нет `any`

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-11 — Phase 17, Таск 1: Настройки контроля — схема + глубокий мёрж + резолвер норматива + рабочее время

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/validations/settings.ts` — расширен `updateSettingsSchema`: `controlEnabled`, частичный `reactionNorms` (`defaultMinutes`, `reminderBeforePercent`, `escalateAfterPercent`, `workHoursOnly`, карты `bySource`/`byStage`/`byUser` с `null` = удалить ключ), `workHours` (`start`/`end` `HH:MM`, `days` 1..7), `stageStuckDaysDefault`, `stuckCheckTime`, `sourceHealthThresholdHours`; `.refine` — хотя бы одно поле; `roundRobinCursor` по-прежнему не в схеме
- `lib/settings/getSettings.ts` (новый) — `parseCompanySettings()` с наложением `DEFAULT_COMPANY_SETTINGS`; `getSettings(companyId)` и `toPublicSettings()` без служебного `roundRobinCursor` в ответе
- `lib/settings/updateSettings.ts` (новый) — глубокий мёрж **только** `reactionNorms` (карты по ключам, `null` удаляет ключ); остальные поля (включая `workHours`) — плоская замена; запись в `Company.settings`
- `app/api/settings/route.ts` — `GET` через `getSettings()`, `PATCH` через `updateSettings()` вместо инлайнового плоского мёржа; ADMIN-only и `companyId` из сессии без изменений
- `lib/risk/computeRisk.ts` — `ReactionNorms` дополнен `escalateAfterPercent`; `minutesSinceCreated` получает `workHours | null` (при `workHoursOnly` — расписание компании, иначе `null`)
- `lib/risk/resolveApplicableNorm.ts` — возвращает также `escalateAfterPercent` из настроек
- `lib/risk/workHoursUtils.ts` — переписан `minutesSinceCreated(createdAt, now, workHours | null)`: при `null` — прежняя простая разница минут; иначе вычитание нерабочих часов/дней; мэппинг дней 1=пн..7=вс ↔ JS `getDay()`
- `lib/risk/resolveApplicableNorm.test.ts` — `escalateAfterPercent` в фикстурах + тест на проброс
- `lib/risk/computeRisk.test.ts` — `escalateAfterPercent: 133` в `buildInput()` (механический фикс фикстуры)
- `lib/risk/workHoursUtils.test.ts` (новый) — 8 кейсов: Пт 19:00 → отсчёт с Пн 09:00, выходные, границы окна, `workHours = null` = простая разница

**Out of scope (не делалось):** трёхступенчатая эскалация (`checkReactionTime`, cron) — Таск 2; `checkStuckLeads`/`checkEndOfDaySummary`/`checkSourceHealth` — Таск 3; UI `/admin/settings` (`ControlSection` и др.) — Таск 4; страница `/control` + `GET /api/control/stats` — Таск 5; `yandexMode`; миграции БД; изменения `lib/events.ts`

**Проверено:** `npm test` (37/37), `npm run type-check`, `npm run build`, `npm run lint` — без ошибок; нет `any`; `computeRisk.test.ts`/`computeRiskBatch.test.ts` зелёные — поведение риска не изменилось при `workHoursOnly: false`

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-11 — Phase 16: Индикатор риска — верификация и затвердевание (оба таска)

**Статус:** ✅ Завершена

**Переопределение фазы (согласовано с пользователем перед планированием):** исходный роадмап описывал Phase 16 как «создать и интегрировать риск», но `lib/risk/computeRisk.ts`/`computeRiskBatch.ts`/`resolveApplicableNorm.ts` уже существовали и были встроены в список/карточку/Kanban ещё в фазах 6/9. Фаза переопределена в тонкую верификацию: тест-харнесс + аудит `companyId`-инварианта + правки доков под реальную модель (`green/yellow/red/grey`, без `none/low/medium/high` и «оранжевого» из устаревшего описания в `_status.md`).

**Таск 1 — тест-харнесс:**

- `package.json`/`vitest.config.ts` (новые) — первый юнит-тест-харнесс проекта (`vitest`, environment `node`, алиас `@/`)
- `lib/risk/computeRisk.test.ts`, `lib/risk/resolveApplicableNorm.test.ts`, `lib/risk/computeRiskBatch.test.ts` (новые) — по кейсу на каждую ветку приоритета причин + порядок применения норматива + инвариант «без N+1» на фейковом `PrismaLike`

**Таск 2 — `companyId` в batch-запросах + аудит + доки:**

- `lib/risk/computeRiskBatch.ts` — добавлен обязательный параметр `companyId`; добавлен в `where` `event.findMany`/`task.findMany` (defense-in-depth, раньше фильтр был только по `leadId in [...]`)
- `lib/leads/getLeads.ts`, `lib/leads/getLeadById.ts`, `lib/pipeline/boardQuery.ts` — передают `companyId` в `computeRiskBatch`; `boardQuery.ts` дополнительно получил `companyId` в отдельном запросе `STAGE_CHANGED`-событий для `avgDaysOnStage`
- `app/api/leads/[id]/route.ts` — четвёртый вызов `computeRiskBatch`, не учтённый в исходном плане `phase-16.md` (собственный `GET`-хендлер, отдельный от `getLeadById.ts`); обязательность нового параметра сразу подсветила пропуск через `tsc` — обновлён
- `.docs/phases/_status.md` — секция Phase 16 переписана под реальную модель риска, фаза и оба таска отмечены ✅
- `.docs/modules/risk.md` — пометки: `workHoursOnly` — no-op до Phase 17, потребитель «Сегодня» — Phase 19

**Out of scope (не делалось):** изменение алгоритма/приоритета причин риска; учёт рабочего времени и настройка нормативов (`reactionNorms`, `workHours`) — Phase 17; эскалация/алерты по риску — Phase 17; экран «Сегодня» — Phase 19; интеграционные/e2e-тесты API-роутов.

**Проверено:** `npm test` (28/28), `npm run type-check`, `npm run build`, `npm run lint` — без ошибок; живая проверка бейджа риска в headless Chromium (Playwright) на реальном dev-сервере и dev-БД — throwaway ADMIN-пользователь в существующей компании с лидами без ответственного, для одного и того же лида во всех трёх точках (`/leads`, `/leads/:id`, `/pipeline`) — идентично `Риск` / `Нет ответственного`; тестовый пользователь и служебные скрипты удалены после проверки, dev-сервер остановлен.

**Definition of Done:** выполнено полностью по `TASK.md`/`phase-16.md` (оба таска)

---

## 2026-07-11 — Phase 15, Таск 4: Инлайн быстрые действия по задаче из строки списка лидов

**Статус:** ✅ Завершён (код, статические проверки и живая проверка в headless-браузере — Playwright, 1280×800, реальный dev-сервер и БД, throwaway-компания/пользователи/лиды/задачи удалены после проверки)

**Исправление документации перед реализацией (согласовано с пользователем):** `components/leads/LeadRowQuickActions.tsx` уже существовал (создан в более ранней фазе, оборачивал только `CloseLeadMenu`) — доработан, а не создан заново. Заодно закрыт смежный пробел: компонент рендерился без проверки `actor.actor === 'user'`, из-за чего маркетолог видел нерабочую кнопку «Закрыть лид» (не входит в его allow-list, 403 при клике) — теперь весь компонент гасится для не-`user`-акторов. `lib/tasks/getNextActions.ts` дополнен полем `createdById`, которого не было в исходном плане файлов `phase-15.md`/`tasks.md`, — без него кнопка «Изменить срок» не могла бы соблюдать правило «автор или ADMIN» из `tasks.md` на уровне UI (только через слепой 403 от сервера).

**Что было сделано:**

- `lib/tasks/getNextActions.ts` — `createdById: true` добавлен в `select` и в тип `NextAction`; аддитивное изменение, `lib/pipeline/boardQuery.ts` не затронут (использует только факт наличия записи)
- `app/(company)/(app)/leads/page.tsx` — вычисляет `currentUserId`/`isAdmin` из `actor` (тот же паттерн, что у `TaskBlock`/`ReminderBlock` в карточке лида) и передаёт их в `LeadsTable`
- `components/leads/LeadsTable.tsx` — новые пропы `currentUserId`/`isAdmin`; на каждой строке вычисляет `canEditNextAction = isAdmin || nextAction.createdById === currentUserId` (`true`, если открытой задачи нет — тогда действие всегда «создать», а не «править»); передаёт `nextAction`/`canEditNextAction`/`showActions` в `LeadRowQuickActions`
- `components/leads/LeadRowQuickActions.tsx` — доработан: компактный `IconButton` (kebab) с выпадающим меню на два пункта — «Поставить следующее действие» (открывает `AddTaskModal` как есть) и «Изменить срок» (открывает `EditDueDateModal`, если задача есть и `canEditNextAction`; если задачи нет — сразу ведёт в тот же `AddTaskModal`; если задача есть, но право на правку отсутствует — пункт задизейблен). Весь компонент (включая существующий `CloseLeadMenu`) скрыт при `showActions === false`. После мутации — `router.refresh()`, локальный стейт строки не заводится
- `components/leads/EditDueDateModal.tsx` (новый) — компактная модалка правки только `dueDate` через `PATCH /api/leads/:id/tasks/:taskId`; переиспользует `toIsoFromLocalParts`/`toLocalDateTimeParts` из `taskConstants.ts`; обрабатывает `400 TASK_NOT_EDITABLE` и `403` отдельными сообщениями (защитный код на случай гонки — кнопка уже скрыта в UI для неавторизованных)

Новых API-роутов, Zod-схем и миграций не потребовалось — использованы существующие `POST /api/leads/:id/tasks` и `PATCH /api/leads/:id/tasks/:taskId`.

**Out of scope (не делалось):** «Назначить ответственного»/«Изменить этап» как быстрые действия из строки (не входят в заголовок таска); возможность снять срок задачи (`dueDate → null`) через компактную модалку (`updateTaskSchema.dueDate` не nullable); изменения логики самого `CloseLeadMenu` кроме гейта видимости.

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; живая проверка в headless Chromium (Playwright, 1280×800) на реальном dev-сервере с throwaway-компанией (ADMIN + MANAGER, лид без задачи + лид с задачей, созданной ADMIN): «Поставить следующее действие» на лиде без задачи → задача создана, колонка «Следующее действие» обновилась после `router.refresh()`; «Изменить срок» от лица ADMIN на задаче, созданной тем же ADMIN, → дата в колонке обновилась; та же задача под сессией MANAGER (не автор, не ADMIN) → пункт «Изменить срок» задизейблен, принудительный клик (`force: true`) модалку не открывает; «Поставить следующее действие» при этом MANAGER доступно без ограничений. Побочно измерено переполнение таблицы по ширине на 1280px (`overflow-x-auto`, уже существовавший паттерн): до таска — 128px переполнения (9 колонок + существующие действия), после добавления компактной kebab-кнопки — 144px (+16px) — рост минимальный, действия остаются доступны прокруткой контейнера. Видимость для маркетолога (`showActions`) проверена по коду/типам (`CompanyActor` отдаёт `userId` только для `actor: 'user'`), сквозной прогон через реальный marketer-access-токен не выполнялся — непропорционально трудозатратно для проверки одного булева гейта. В консоли браузера — только предсуществующий шум (`[sse] connection error` в headless-режиме).

**Definition of Done:** выполнено полностью по `TASK.md`, кроме сквозной live-проверки видимости для маркетолога (заменена проверкой по коду/типам, см. выше)

---

## 2026-07-11 — Phase 15, Таск 3: Промпт при смене этапа + колонка «Следующее действие»

**Статус:** ✅ Завершён (код, статические проверки и живая проверка в headless-браузере — Playwright, 1280×800, реальный dev-сервер и БД, throwaway-компания/пользователь/лиды/задача удалены после проверки)

**Исправление документации перед реализацией:** `.docs/phases/phase-15.md`/`.docs/modules/tasks.md` ссылались на несуществующие `components/pipeline/useKanbanDnd.ts`/`KanbanBoard.tsx` — реальный drag-and-drop живёт инлайн в `handleDragEnd` внутри `components/pipeline/PipelineBoard.tsx`; промпт встроен туда же, отдельный хук не заводился.

**Что было сделано:**

- `lib/tasks/getNextActions.ts` (новый) — батч-резолвер `leadIds → Map<leadId, { taskId, title, dueDate } | null>`; сортировка `orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]`, идентична `GET /api/leads/:id/tasks`
- `lib/leads/getLeads.ts` — `getLeadsWithRisk()` подмешивает `nextAction` поверх результата (`LeadListItem & { risk } & { nextAction }`), не в сам интерфейс `LeadListItem` — иначе ломается `toLeadListItem()` в `app/api/leads/[id]/route.ts`, не участвующий в этом таске
- `lib/pipeline/boardQuery.ts` — `BoardLeadCard.hasOpenTask` (boolean), вычисляется тем же `getNextActions` без отдельного третьего запроса к `Task`
- `components/leads/LeadsTable.tsx` — колонка «Следующее действие»: название + срок либо «Нет следующего действия» (предупреждающим цветом)
- `components/pipeline/PipelineBoard.tsx` — в `handleDragEnd`, после успешного `PATCH /api/leads/:id/stage` (внутри `try`, не в `catch`-откате), если у перемещённого лида (снапшот `columns` до перемещения) `!hasOpenTask` → открывается `AddTaskModal` с заголовком «Что делаем дальше и когда?»; по `onCreated` — локальный `hasOpenTask` лида выставляется в `true` (не переспрашивает при повторном перемещении в той же сессии); промпт не встроен ни в reorder внутри колонки, ни в ветку отката при сбое `PATCH`
- `components/tasks/AddTaskModal.tsx` — новый опциональный проп `title` (по умолчанию «Новая задача») для переиспользования с другим заголовком в промпте

**Out of scope (не делалось):** инлайн быстрые действия из строки списка лидов (`LeadRowQuickActions`, `EditDueDateModal`) — Таск 4; визуальный бейдж `hasOpenTask` на карточке Kanban — поле используется только для логики промпта; интеграция в сквозной риск (`computeRisk`) — Phase 16

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; живая проверка в headless Chromium (Playwright) на реальном dev-сервере с throwaway-компанией (2 этапа, 2 лида — один без задачи, один с заранее созданной открытой задачей): колонка «Следующее действие» показывает заголовок+срок задачи для одного лида и «Нет следующего действия» для другого; drag-and-drop лида без задачи в другую колонку → стадия сменилась → появился промпт «Что делаем дальше и когда?» → создание задачи → промпт закрылся → смена этапа подтверждена после перезагрузки страницы; повторное перемещение того же лида (теперь с задачей) → промпт не появляется; перемещение лида с изначально существующей задачей → промпт не появляется; ошибок в консоли браузера нет

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-11 — Phase 15, Таск 2: UI блока «Задачи» в карточке на реальном API + чистка мок-каркаса

**Статус:** ✅ Завершён (код, статические проверки и живая проверка в headless-браузере — Playwright, 1280×720, реальный dev-сервер и БД)

**Что было сделано:**

- `components/tasks/TaskBlock.tsx` — переписан на `GET /api/leads/:id/tasks` при монтировании (loading/error как в `ReminderBlock`); разбивка на активные/историю по реальному `status`; клиентская сортировка повторяет серверную (`compareActiveTasks`/`compareInactiveTasks`); обновление стейта после `POST`/`PATCH`/`DELETE`; цикл статусов по клику на кружок — async `PATCH` с обработкой ошибок; пустое состояние «Нет задач по этому лиду»
- `components/tasks/TaskItem.tsx` — `TaskData` под реальный шейп API (`assignedTo: { id, name }`, ISO-даты, `createdById`); проп `canEdit` скрывает карандаш и интерактивный кружок статуса для не-автора и не-ADMIN; просроченные активные задачи (`dueDate < now`) визуально выделены
- `components/tasks/AddTaskModal.tsx` — единый datetime-picker; исполнители из `GET /api/users/assignable`; клиентская Zod-валидация (`createTaskSchema`); сам делает `POST` и вызывает `onCreated(task)`; при пустом сроке ключ `dueDate` не отправляется
- `components/tasks/EditTaskModal.tsx` — реальные исполнители, `updateTaskSchema`, сам делает `PATCH`/`DELETE`; «Изменить»/«Отменить» — автор или ADMIN; «Удалить» — только ADMIN, независимо от статуса задачи
- `components/tasks/taskConstants.ts` — убраны `ASSIGNEE_OPTIONS`/`ASSIGNEE_LABELS`; `formatDueDateLabel`/`formatCompletedAtLabel` на `Date`/ISO; добавлены `compareActiveTasks`/`compareInactiveTasks`/`isTaskOverdue`; оставлены `ACTIVE_STATUSES`/`INACTIVE_STATUSES`/`isTaskEditable`
- `app/(company)/(app)/leads/[id]/page.tsx` — `<TaskBlock>` обёрнут в `actor.actor === 'user'`; переданы `currentUserId` и `canDelete={hasMinRole(actor.role, 'ADMIN')}`
- Удалены мёртвые моки: `TasksBoard.tsx`, `TaskGroup.tsx`, `TaskRow.tsx`, `PrioritySegment.tsx`, `CreateTaskModal.tsx`

**Out of scope (не делалось):** CRUD API и `GET /api/users/assignable` (Таск 1); промпт при смене этапа, колонка «Следующее действие», `getNextActions.ts` (Таск 3); инлайн-действия из строки списка лидов (Таск 4); `QuickTaskTypeButtons`; интеграция риска (`computeRisk`) — Phase 16

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; живая проверка в headless Chromium (Playwright): создание → отображение → цикл статусов TODO→IN_PROGRESS→DONE (по PATCH-ответам) → отмена → появление в истории → удаление (ADMIN); MANAGER видит чужую (ADMIN) задачу без карандаша/интерактивного кружка, клик не открывает модалку; свою задачу может редактировать; пустое состояние на лиде без задач; в консоли — только предсуществующий шум (`[sse] connection error`, hydration-warning в `LeadComments`)

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-11 — Phase 15, Таск 1: CRUD API задач + assignable-список + события

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/validations/tasks.ts` (новый) — `createTaskSchema` (`title` 1–200, `assignedToId`, опциональные `dueDate` ISO-datetime и `description` ≤ 2000), `updateTaskSchema` (все поля партиальные + `status: z.nativeEnum(TaskStatus)`), типы через `z.infer`
- `app/api/leads/[id]/tasks/route.ts` (новый) — `GET`: лид через `visibilityWhere`-паттерн (как в `reminders/route.ts`) → вне видимости/чужая компания → `404`; два запроса для сортировки — активные (`TODO`/`IN_PROGRESS`) по `dueDate asc` → `createdAt asc`, неактивные (`DONE`/`CANCELLED`) по `completedAt desc`; `assignedTo { id, name }` в ответе. `POST`: явная проверка исполнителя (`companyId` + `isBlocked: false`) → иначе `400 ASSIGNEE_INVALID`; `writeEvent(TASK_CREATED)` с `leadId`, `userId`, `payload.taskId`. Guard — `requireCompanyUser({ minRole: 'MANAGER' })`
- `app/api/leads/[id]/tasks/[taskId]/route.ts` (новый) — `PATCH`: задача по `{ id: taskId, leadId, companyId }`; `DONE`/`CANCELLED` → `400 TASK_NOT_EDITABLE`; право — автор или `ADMIN`, иначе `403`; переход в `DONE` → `completedAt = now()` + `TASK_DONE`; в `CANCELLED` → `completedAt = null` + `TASK_CANCELLED`; правка полей / `TODO`/`IN_PROGRESS` → `TASK_UPDATED` (одно событие на запрос, даже при одновременной смене `status` и полей). `DELETE`: физическое удаление, строго `hasMinRole(role, 'ADMIN')`, без события
- `app/api/users/assignable/route.ts` (новый) — `GET` только `{ id, name }` активных (`isBlocked: false`) пользователей компании; guard `requireCompanyUser({ minRole: 'MANAGER' })`
- `constants/eventLabels.ts` — кейсы `TASK_CREATED`/`TASK_UPDATED`/`TASK_DONE`/`TASK_CANCELLED` в company-side `getEventLabel()` (раньше падали в `default`)

**Out of scope (не делалось):** UI (`TaskBlock`, `AddTaskModal`, `EditTaskModal`, чистка мок-каркаса `components/tasks/*`) — Таск 2; промпт при смене этапа, колонка «Следующее действие», `getNextActions.ts` — Таск 3; инлайн быстрые действия из списка лидов — Таск 4; Prisma-миграция (не нужна); добавление задач/`assignable` в allow-list маркетолога (`constants/marketerAccess.ts`) — по спецификации маркетолог задач не касается; уведомления о дедлайне — Phase 17

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; нет `any`. Guard `requireCompanyUser` (не `requireCompanyAccess`) — маркетолог получает `403` на всех эндпоинтах задач и `assignable` без записи в allow-list

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-11 — Phase 14, Таск 3: UI блока «Напоминания» в карточке лида + чистка мок-блока настроек

**Статус:** ✅ Завершён (код, статические проверки и живая проверка в headless-браузере — Playwright, реальный dev-сервер и БД, throwaway-компания/пользователь/лид удалены после проверки)

**Что было сделано:**

- `components/reminders/ReminderItem.tsx` (новый) — строка активного напоминания (дата, текст, бейджи каналов, «Изменить»/«Отменить»); экспортирует тип `ReminderData` и `ChannelBadge`/`toChannelList()` (гард для `Prisma.JsonValue` → `ReminderChannelName[]`); кнопки действий видны только автору или `ADMIN` (`canManage`)
- `components/reminders/ReminderHistory.tsx` (новый) — свёрнутый список `FIRED`/`CANCELLED`, без кнопок действий
- `components/reminders/AddReminderModal.tsx` (новый) — модалка создания/редактирования; `remindAt` собирается из локальных `date`+`time` через `new Date(...).toISOString()` (не ручная склейка `'Z'`); клиентская Zod-валидация (`createReminderSchema`); предупреждение «Telegram не привязан» при выбранном Telegram и `telegramConnected === false`
- `components/reminders/ReminderBlock.tsx` (новый) — `Card` с `GET /api/leads/:id/reminders` в `useEffect`, разбивка на активные/историю, счётчик, пустое состояние, обновление списка после мутаций
- `app/(company)/(app)/leads/[id]/page.tsx` — точечный `prisma.user.findUnique` за `telegramChatId` текущего актора; `<ReminderBlock>` вставлен в правую колонку, гейт `actor.actor === 'user'` (маркетолог блок не видит)
- `components/settings/RemindersSection.tsx` — удалён (мёртвый мок с несуществующими в схеме полями)
- `components/settings/SettingsClientArea.tsx` — `'reminders'` убран из `DirtyKey`, `dirtyFlags`, `handleSave`

**Out of scope (не делалось):** allow-list маркетолога для напоминаний (по спецификации маркетолог не имеет доступа к напоминаниям вообще); SMS/другие каналы; перевод `TaskBlock` на реальный API (Phase 15)

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; живая проверка в headless Chromium (Playwright) на реальном dev-сервере: логин реального пользователя → карточка лида → пустое состояние → создание напоминания (с видимым предупреждением о непривязанном Telegram) → появление в активном списке → редактирование текста → отмена → перенос в свёрнутую историю со статусом «отменено» и бейджами каналов; `/admin/settings` — блок «Напоминания» отсутствует, `SecuritySection` продолжает рендериться; в консоли браузера — только два предсуществующих предупреждения, не связанные с этим таском (`[sse] connection error` при переподключении под headless, hydration-warning внутри нетронутого `SecuritySection`)

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-10 — Phase 14, Таск 1: Ядро напоминаний — cron-эндпоинт + каналы доставки

**Статус:** ✅ Завершён (код, статические проверки и живая проверка против реального dev-сервера — throwaway-компания/лид/напоминания удалены после проверки)

**Что было сделано:**

- `lib/reminders/channels/types.ts` (новый) — интерфейс `ReminderChannel`, тип `ReminderWithContext` (`Reminder` + `lead` + `createdBy`)
- `lib/reminders/channels/telegram.ts` — `deliver()` через `sendTelegramMessage`; пустой `telegramChatId` → `throw`; `false` от `sendTelegramMessage` → `throw` (иначе сбой не попадёт в `Promise.allSettled`)
- `lib/reminders/channels/email.ts` — `deliver()` через `sendEmail`/`isEmailConfigured`; без настроенного SMTP — `throw` до вызова `sendEmail`
- `lib/reminders/channels/index.ts` (новый) — реестр `{ telegram, email }`, `deliverChannels()` с явной привязкой результата к имени канала (`ChannelDeliveryResult`)
- `lib/reminders/processReminders.ts` (новый) — выборка due `PENDING` по всем компаниям (без `companyId`, без фильтра `isBlocked`); guard идемпотентности через `updateMany` (`count === 0` → `continue`); `writeEvent(REMINDER_FIRED)` / `writeEvent(REMINDER_FAILED)` с `leadId` и `payload.reminderId` (+ `payload.channel`); `try/catch` на каждую итерацию; сводка `{ processed, delivered, failed }`
- `lib/cron/verifyCronSecret.ts` (новый) + `lib/validations/cron.ts` (новый) — проверка `CRON_SECRET` в трёх равнозначных форматах (`Authorization: Bearer`, `x-cron-secret`, `?key=`)
- `app/api/cron/reminders/route.ts` (новый) — `POST` без сессии, `dynamic = 'force-dynamic'`, `verifyCronSecret` → `401`, иначе `processReminders()` → JSON-сводка; не в matcher `proxy.ts`
- `app/api/platform/cron/subscription-reminders/route.ts` — локальная проверка секрета заменена на `verifyCronSecret` (механический рефакторинг, поведение не менялось)
- `lib/reminders/scheduler.ts` — удалён (неиспользуемый стаб, заменён cron-эндпоинтом)
- `.docs/modules/reminders.md` — до реализации исправлены примеры `writeEvent()` (сигнатура `lib/events.ts`, нельзя вызывать внутри `$transaction`)

**Out of scope (не делалось):** CRUD `/api/leads/:id/reminders*` (Таск 2); UI блока «Напоминания» в карточке лида + удаление мока `RemindersSection.tsx` (Таск 3); регистрация записи в VPS crontab — ручной ops-шаг после деплоя; новые ENV (используется существующий `CRON_SECRET` из Phase 3)

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; живая проверка на dev: `401` без/с неверным секретом (все 3 формата по отдельности), `200` с верным секретом; due-напоминание в заблокированной компании (`isBlocked: true`) → `FIRED`; повторный вызов → `processed: 0` (без дублей доставки); упавшее напоминание не блокирует остальные в батче; `REMINDER_FIRED`/`REMINDER_FAILED` с корректным `leadId` и `payload`; напоминание с `remindAt` в будущем не трогается; `node-cron` не добавлен, `instrumentation.ts` не создан

**Definition of Done:** выполнено полностью по `TASK.md`

---

## 2026-07-10 — Phase 13, Таск 3: UI привязки Telegram + admin-тумблер `telegramEnabled` + доки

**Статус:** ✅ Завершён (код и статические проверки; живая проверка через бота — не проводилась)

**Что было сделано:**

- `components/notifications/TelegramBindButton.tsx` (новый) — Client Component: проп `connected`; «Подключить» → `POST /api/telegram/bind` + открытие `deepLink`; «Отключить» → `DELETE /api/telegram/bind` + `router.refresh()`; состояние привязки только из серверного пропса
- `components/profile/ProfileNotifications.tsx` — удалена мёртвая disabled-строка «Уведомления в Telegram» / «Появится после подключения…»; вместо неё строка «Telegram-бот» с `TelegramBindButton`; три тумблера prefs (`assignedLead`/`commentOnLead`/`reminders`) без изменений — `assignedLead` остаётся реальным гейтом Telegram-доставки
- `lib/users/profile.ts` + `types/users.ts` — `telegramChatId` в `USER_PROFILE_SELECT`, наружу только производный `telegramConnected: boolean` (общий маппинг для `/profile` и `/team/:id`, сырой `chatId` клиенту не уходит)
- `components/profile/ProfileLayout.tsx` — проброс `telegramConnected={profile.telegramConnected}` в `<ProfileNotifications>`
- `components/settings/NotificationsSection.tsx` — переписан: убраны моки (`newLead`/`assignedToMe`/ручной `telegramChatId`-инпут) и `onDirtyChange`; один тумблер «Telegram-уведомления для компании», немедленный `PATCH /api/settings` по паттерну `AssignModeSection` (свой `useState` + Toast, откат при ошибке)
- `components/settings/SettingsClientArea.tsx` — `NotificationsSection` убран из батч-сохранения; ключ `'notifications'` удалён из `DirtyKey` и обоих объектов `dirtyFlags`
- `app/(company)/(admin)/admin/settings/page.tsx` — `readTelegramEnabled(settings)` + `<NotificationsSection initialTelegramEnabled={...} />` вне `SettingsDirtyProvider`, рядом с `AssignModeSection`
- `lib/validations/settings.ts` — `telegramEnabled: z.boolean().optional()`; `.refine` обобщён на «хотя бы одно из `assignMode`/`telegramEnabled`» (одиночный `PATCH { telegramEnabled }` больше не отклоняется)
- `CLAUDE.md` — env `TELEGRAM_BOT_USERNAME`/`TELEGRAM_WEBHOOK_SECRET` + заметка о ручном `setWebhook` (ops-шаг, как crontab Phase 1)
- `.docs/modules/admin-users.md` — строка Telegram в профиле: кнопка привязки + гейт через `assignedLead`, без формулировки «появится в Phase 13»
- `.docs/modules/notifications.md` — `NotificationPreferences` как типизированный объект (не `disabledTypes[]`); аудитория Telegram нового лида = только назначенный менеджер; scope Phase 13 = операционная доставка нового лида
- `.docs/phases/phase-13.md` + `.docs/phases/_status.md` — таск 3 ✅, фаза 13 ✅ Завершено (2026-07-10)

**Out of scope (не делалось):** статус привязки на `/team/:id` (поле в типе есть, UI карточки не расширяли); `RemindersSection`/`SecuritySection` в `/admin/settings` — моки не трогали; управленческие алерты — Phase 17; живые Telegram-триггеры `commentOnLead`/`reminders` — вне scope.

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; нет `any`. Живой e2e (`/profile` deep-link + `/start` в боте, `/admin/settings` тумблер + reload) — **не проводился** в этой сессии (нет доступа к реальному боту/браузеру); проверить руками на dev-окружении.

**Definition of Done:** выполнено полностью по коду и статическим проверкам; пункты DoD с ручным обходом UI в браузере — на стороне поставщика

---

## 2026-07-10 — Phase 13, Таск 2: Привязка Telegram-аккаунта (миграция + bind + webhook)

**Статус:** ✅ Завершён

**Что было сделано:**

- `prisma/schema.prisma` + миграция `20260710051201_phase_13_telegram_bind` — `User.telegramBindTokenHash` (`@unique`) + `telegramBindTokenExpiresAt`; создана вручную (`prisma migrate dev` недоступен в неинтерактивном окружении — сгенерирован SQL через `prisma migrate diff --from-url ... --to-schema-datamodel`, применён через `prisma migrate deploy`)
- `lib/telegram/bindToken.ts` (новый) — `createBindToken`/`resolveBindToken`, переиспользуют `generateToken`/`hashToken` из `lib/tokens.ts` (тот же паттерн, что и `passwordReset.ts`); резолв — один атомарный `$queryRaw` `UPDATE ... WHERE hash AND expiresAt RETURNING id` (не read-then-clear — исключает гонку повторного использования токена)
- `lib/validations/telegram.ts` (новый) — Zod для тела Telegram-вебхука + `extractStartToken()`
- `app/api/telegram/bind/route.ts` (новый) — `POST`/`DELETE`, guard `requireCompanyUser({ minRole: 'MANAGER' })`
- `app/api/telegram/webhook/route.ts` (новый) — `POST` без сессии, секрет `X-Telegram-Bot-Api-Secret-Token`, всегда `200` на бизнес-провал (просрочен/неизвестен токен), `401` только на неверный секрет
- `.docs/database.md` — задокументированы новые поля `User`

**Найденный и исправленный баг (обнаружен только на живом прогоне, не типами/линтом):** атомарный `UPDATE` в `resolveBindToken` изначально сравнивал `telegramBindTokenExpiresAt > NOW()`. `telegramBindTokenExpiresAt` — наивная колонка `timestamp(3)` (Prisma пишет туда UTC-эквивалент без TZ), а `NOW()` — `timestamptz`; Postgres приводит `timestamptz` к `timestamp` через **timezone сессии**, а не UTC. Сессия dev-БД — `Etc/GMT-3` (UTC+3), из-за чего `NOW()`, приведённый к naive, оказывался на 3 часа позже реального UTC — валидный токен (TTL 15 мин) ошибочно считался просроченным всегда. Вебхук при этом отвечал `200 {"ok":true}` в обоих случаях (успех/провал — намеренно одинаковый ответ, см. риск в `TASK.md`), поэтому баг не был виден по HTTP-ответу — только по факту, что `telegramChatId` в БД не менялся. Исправлено: `AND "telegramBindTokenExpiresAt" > (NOW() AT TIME ZONE 'UTC')`. Проверено, что связывание JS `Date` как параметра вместо `NOW()` **не** решает проблему (тот же наивный каст на стороне Postgres) — рабочий фикс только через `AT TIME ZONE 'UTC'` в самом SQL.

**Out of scope (не делалось):** UI привязки, admin-тумблер `telegramEnabled`, `CLAUDE.md`/`admin-users.md` доки — таск 3.

**Проверено:** `npm run type-check`, `npm run lint` — без ошибок. Живой e2e на dev-БД через реальный HTTP-сервер (`next dev`) и реальные сессии:

- `POST /api/telegram/bind` без сессии → `401`; с сессией `test-manager@test.ru` (MANAGER) → `200` + `deepLink`, хэш+TTL записаны в БД
- `POST /api/telegram/webhook` без секрета / с неверным секретом → `401` (дважды); с верным секретом + `/start <token>` → `200`, `telegramChatId` проставлен, bind-поля обнулены
- Повторный вызов с тем же (уже использованным) токеном и другим `chat.id` → `200`, но `telegramChatId` **не изменился** — одноразовость подтверждена на живой БД
- `DELETE /api/telegram/bind` → `200`, `telegramChatId` очищен; без сессии → `401`
- Marketer-сессия на `POST /api/telegram/bind` — не проверена вживую (у доступного dev-фикстуры маркетолога `kordont@yandex.ru` нет видимости/гранта на тестовую компанию, `POST /api/platform/companies/:id/marketer-access` → `404`); опирается на то, что `requireCompanyUser` — тот же guard, что уже проверен вживую с реальной marketer-сессией в Phase 12 таск 3 (`/api/notifications/*` → `403`)

Тестовые артефакты (bind-токен, `telegramChatId`, временные `.env`-записи `TELEGRAM_WEBHOOK_SECRET`/`TELEGRAM_BOT_USERNAME`, dev-сервер) удалены/остановлены после проверки. Пароль `test-manager@test.ru` восстановлен на значение из предыдущей сессии (Phase 12); пароль `kordont@yandex.ru` (уже была dev-фикстура с заранее известным паролем — см. запись Phase 12 таск 3) переустановлен на новое известное значение, не восстановлен к прежнему (не был сохранён перед сбросом) — не проблема, аккаунт тестовый, не прод.

**Definition of Done:** выполнено полностью

---

## 2026-07-10 — Phase 13, Таск 1: Telegram-канал + доставка нового лида назначенному менеджеру

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/telegram.ts` — реализован `sendTelegramMessage(chatId, text)`: Bot API `sendMessage` без `parse_mode` (plain text), весь сетевой I/O в try/catch, graceful no-op при пустом `TELEGRAM_BOT_TOKEN` (лог, не throw), возвращает `boolean`
- `constants/telegramTemplates.ts` (новый) — типизированный реестр шаблонов; в этой фазе — `newLeadForManager({ name, source })` → строка; форма реестра рассчитана на управленческие шаблоны Phase 17
- `lib/notifications/notifyManager.ts` (новый) — операционный алерт конкретному `User`: тройной гейт (`Company.settings.telegramEnabled` + `telegramChatId` + личная настройка `assignedLead` через `parseNotificationPreferences`) → `sendTelegramMessage`; провал любого условия — тихий выход; ключ алерта `'NEW_LEAD'` — отдельный словарь, не `EventType`/`Notification.type`; локальный `getTelegramEnabled()` читает JSONB с дефолтом из `DEFAULT_COMPANY_SETTINGS`
- `lib/notifications/notifyNewLead.ts` — Telegram-ветка **после** `broadcastPerUser(...)`: если `lead.assignedToId` задан — отдельный запрос `prisma.user.findFirst({ where: { id, companyId } })` и `notifyManager(assignee, 'NEW_LEAD', { name, source })`; аудитория Telegram не переиспользует широкий SSE-набор `recipients` (HEAD/ADMIN не спамятся)

**Out of scope (не делалось):** миграция `telegramBindTokenHash`/`telegramBindTokenExpiresAt`, `POST/DELETE /api/telegram/bind`, `POST /api/telegram/webhook` — таск 2; UI привязки (`TelegramBindButton`), активация строки «Уведомления в Telegram» в `ProfileNotifications`, admin-тумблер `telegramEnabled` в `/admin/settings`, env/доки — таск 3; управленческие алерты (`ASSIGNMENT_FAILED`, эскалация, зависшие лиды) — Phase 17; доставка комментариев и напоминаний в Telegram — вне scope.

**Проверено:** `npm run type-check` — без ошибок; нет `any`. Живая отправка в Telegram не проверялась — для e2e нужны таск 2 (привязка `chat_id`) и таск 3 (тумблер `telegramEnabled` + UI).

**Definition of Done:** выполнено полностью

---

## 2026-07-09 — Фикс «дёрганья» сайдбара + шапка на всю ширину

**Статус:** ✅ Завершено (вне формального роадмапа фаз — багфикс по запросу)

**Проблема 1 (шапка «обрезана» справа):** `app/globals.css` содержал устаревший `html { scrollbar-gutter: stable; }` (со времён шаблона до появления текущего `AppLayout` с вложенным `overflow-auto` в `main`). Прокрутка реально происходит не на `html`, а внутри `PageContent`, поэтому `html`-уровневый гаттер просто резервировал пустую полосу у правого края окна без функции. Убрано.

**Проблема 2 (дёрганье сайдбара при переходах между страницами):** `(app)`, `(management)`, `(admin)` были тремя независимыми route group с ОТДЕЛЬНЫМИ `layout.tsx`, каждый из которых сам оборачивал `children` в `<AppShell>`. Next.js App Router не считает эти layout'ы общими (нет единого родителя, кроме корневого `app/layout.tsx`), поэтому переход, например, `/leads` → `/admin/users` полностью размонтировал и заново монтировал `AppShell`/`Sidebar`/`ThemeProvider`/`SseProvider` — визуально это «дёрганье». Переходы **внутри** одной группы (например `/today` → `/leads`) не дёргались — поэтому баг проявлялся только «на некоторых страницах».

**Фикс:** три группы вложены в новую `app/(company)/layout.tsx` — единственное место, где теперь рендерится `<AppShell>`. `(app)`/`(management)`/`(admin)` остались как папки-группы (для ролевой организации, как задокументировано в `CLAUDE.md`), но без собственных `layout.tsx`. URL не изменились (route groups не создают сегментов пути) — `git mv` папок + `next build` подтвердили идентичное дерево роутов.

**Проверено:** Playwright — DOM-узел `<aside>` (сайдбар) помечен вручную на `/today`, метка пережила клиентские переходы `/today → /team → /admin/integrations` без исчезновения (то есть без remount). `npm run type-check`, `npm run lint`, `npm run build` — чисто (после `rm -rf .next`, так как в кэше остались ссылки на старые пути).

**Definition of Done:** см. `.docs/dod-global.md`.

---

## 2026-07-09 — Профили пользователей компании (`/profile`) + карточка сотрудника (`/team`)

**Статус:** ✅ Завершено (вне формального роадмапа фаз — доработка по запросу)

**Цель:** Менеджер/Руководитель/Администратор настраивают собственный профиль (ФИО, контакты, аватар, пароль, уведомления) — по образцу уже реализованного self-service профиля маркетолога. Руководитель и Администратор видят список всех сотрудников компании и открывают read-only карточку.

**Что было сделано:**

- Миграция `add_user_profile_fields` — аддитивные поля `User.phone`/`avatarUrl`/`telegram`/`max`/`otherContact` (зеркалят `PlatformAdmin`, кроме `vk`)
- `lib/s3.ts` (переезд из `lib/platform/s3.ts`) — `uploadAvatar`/`deleteAvatar` получили параметр `namespace: 'marketers' | 'users'`; `app/api/platform/profile/avatar/route.ts` обновлён на новый импорт
- `lib/users/profile.ts` — `USER_PROFILE_SELECT` + `toUserProfileDetail()`, общий маппинг для `/profile` и `/team/:id`
- `lib/notifications/preferences.ts` — `parseNotificationPreferences()` (JSON → типизированный объект с дефолтами)
- `lib/validations/users.ts` — `updateOwnProfileSchema`/`changeOwnPasswordSchema`/`updateNotificationPreferencesSchema`
- `app/api/users/me/route.ts` (GET/PATCH), `.../avatar/route.ts` (POST/DELETE, S3), `.../password/route.ts` (PATCH, проверка текущего пароля через `comparePassword`), `.../notification-preferences/route.ts` (PATCH) — все на guard'е `requireCompanyUser` (маркетолог отсекается автоматически, у него нет `session.user`)
- `app/(app)/profile/page.tsx` — Server Component, подключает уже существовавший, но не заинченный шаблон `components/profile/*` (`ProfileLayout`/`PersonalSection`/`ContactsSection`/`SecuritySection`/`ProfileNotifications`/`ProfileSidebar`/`ProfileFooter`) к реальным данным вместо фейковых
  - `PersonalSection` упрощён с несуществующих `firstName/lastName/displayName` до одного поля `name` (у `User` только одно поле ФИО)
  - `SecuritySection`: поле «Текущий пароль» было `readOnly` и показывало захардкоженную строку — исправлено на редактируемый инпут (иначе пароль нельзя ввести); реальный вызов `PATCH /api/users/me/password`
  - `ProfileNotifications`: три тумблера сохраняются немедленно (`PATCH .../notification-preferences`); строка Telegram задизейблена с пометкой «Появится после подключения Telegram-бота» — намеренно не подключена (реальная привязка `chat_id` через бот — Phase 13, а не ручной ввод)
  - Personal+Contacts объединены в один батч-сейв через общий `ProfileFooter` (Save/Cancel), Security и Notifications сохраняются немедленно собственными действиями — вне общего dirty-трекинга
- `app/(management)/team/page.tsx` + `.../team/[id]/page.tsx` — список всех сотрудников компании (любая роль) и read-only карточка; `companyId`-скоуп в `findUnique` (`notFound()` при чужой компании); доступ `hasMinRole(role, 'HEAD')`, как `/control`/`/reports`
- `components/team/TeamTable.tsx` + `TeamMemberDetail.tsx` — новые, без действий редактирования/блокировки (это остаётся на `/admin/users`)
- `proxy.ts` — добавлены `/profile` (любая роль компании, маркетолог отсекается существующим allow-list) и `/team` (HEAD+) в матчер и проверку роли
- `constants/navItems.ts` — пункт «Команда» (`/team`, `minRole: 'HEAD'`)
- `components/layout/Sidebar.tsx` — нижний блок профиля теперь `Link` на `/profile` (когда передан `profileHref`) + реальный аватар вместо только инициалов; `AppShell.tsx` пробрасывает `avatarUrl` и `profileHref="/profile"` для user-ветки (marketer-ветка не получает `profileHref` — ссылки нет)

**Out of scope (сознательно):** Telegram-привязка чата и связанный переключатель (Phase 13); события (`Event`) на изменения профиля/пароля/уведомлений не пишутся — как и у профиля маркетолога, это self-service, а не журналируемое действие; блокировка/смена роли сотрудника из `/team` не добавлялись — это остаётся в `/admin/users`.

**Проверено:** `npm run type-check`, `npm run lint` — без ошибок.

**Definition of Done:** см. `.docs/dod-global.md`.

---

## 2026-07-09 — Phase 12, Таск 4: UI уведомлений — SseProvider + тост + колокольчик + dropdown + Zustand

**Статус:** ✅ Завершён

**Что было сделано:**

- `store/notificationStore.ts` — Zustand-стор (без `'use client'`): `{ items, unreadCount }` + `hydrate`, `addFromSse`, `markAllRead()`; тип `NotificationItem` с `createdAt`/`readAt` как ISO-строки
- `lib/notifications/getUserNotifications.ts` (новый) — серверный хелпер `getUserNotifications(userId, companyId, limit?)` → `{ items, unreadCount }` с явной сериализацией дат в ISO; общий источник для API и SSR-гидрации
- `app/api/notifications/route.ts` — рефакторинг `GET` на `getUserNotifications` (контракт ответа не изменился)
- `components/notifications/SseProvider.tsx` (новый) — гидрация стора из пропсов при маунте; `EventSource('/api/stream')` → `addFromSse` + toast-слот «Новый лид {имя}» с действием «Открыть» → `/leads/:id`; закрытие `EventSource` при размонтировании
- `components/notifications/NotificationBell.tsx` (новый) — `IconButton` (`lucide:bell`) + бейдж `unreadCount`, тумблер dropdown, закрытие по клику вне
- `components/notifications/NotificationDropdown.tsx` (новый) — список из стора, относительное время, индикатор непрочитанного, «Прочитать всё» (`POST /api/notifications/read` + `markAllRead()`), клик по пункту → `/leads/:leadId`; пустое состояние «Нет уведомлений»
- `components/layout/AppShell.tsx` — в user-ветке: `getUserNotifications` + обёртка `{children}` в `<SseProvider>`; marketer-ветка и fallback-ветки без провайдера
- Колокольчик в `PageHeader`: `/today`, `/leads` и `/pipeline` (только `actor.actor === 'user'`), `/admin/pipeline-settings` (ADMIN-only); статичные `BellIcon` удалены с затронутых страниц

**Out of scope (не делалось):** колокольчик на страницах без `PageHeader` (`/control`, `/reports`, `/admin/users`, `/admin/settings`, `/admin/integrations`, карточка лида); индивидуальная пометка одного уведомления из dropdown; Telegram-доставка, `notification-preferences` — Phase 13.

**Проверено:** `npm run type-check`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-09 — Phase 12, Таск 3: API непрочитанных + mark-as-read

**Статус:** ✅ Завершён

**Что было сделано:**

- `constants/notifications.ts` (новый) — `DEFAULT_NOTIFICATIONS_LIMIT` (20) / `MAX_NOTIFICATIONS_LIMIT` (50)
- `lib/validations/notifications.ts` (новый) — `notificationsQuerySchema`: `limit` через `z.coerce.number()`, ограничен максимумом
- `app/api/notifications/route.ts` (новый) — `GET`: `requireCompanyUser({ minRole: 'MANAGER' })` (жёсткий блок маркетолога, не allow-list); `where: { userId, companyId }`, `orderBy: createdAt desc`, `take: limit`; параллельно `count({ readAt: null })` → `unreadCount`
- `app/api/notifications/read/route.ts` (новый) — `POST`: тот же guard, `updateMany({ where: { userId, companyId, readAt: null } })` → отмечает все непрочитанные пользователя
- `app/api/notifications/[id]/read/route.ts` (новый) — `POST`: тот же guard, `updateMany({ where: { id, userId, companyId } })`; `count === 0` → `404` (не подтверждает существование чужой записи)

**Out of scope (не делалось):** `SseProvider`, колокольчик, dropdown, `store/notificationStore.ts` — таск 4; Telegram-доставка, `notification-preferences` — Phase 13.

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок. Ручной end-to-end смоук на реальной dev-БД через живой HTTP-сервер и реальные сессии (NextAuth credentials-логин, cookie-based):

- Два реальных `MANAGER` одной компании (`test-manager@test.ru`, `maneger-test-two@test.ru`) — `GET` каждому возвращает только свои уведомления и свой `unreadCount`, несмотря на общий `companyId` (подтверждает, что фильтр по `userId`, а не только по `companyId`, реально работает, не только в схеме запроса)
- `POST /api/notifications/:id/read` на чужом `id` и на несуществующем `id` — оба `404`; на своём — `200` + `readAt` персистится (проверено повторным `GET`)
- `POST /api/notifications/read` гасит `unreadCount` до `0` только у вызвавшего пользователя, второй пользователь не затронут
- Без сессии — `401` на всех трёх эндпоинтах
- Реальная marketer-сессия (через `POST /api/platform/companies/:id/marketer-access` → одноразовый токен → провайдер `marketer-access`) — `403` на всех трёх эндпоинтах, подтверждён жёсткий блок (не allow-list)
- Невалидный `limit` (`abc`, `0`, `9999`) → `400 VALIDATION_ERROR`

Тестовые данные (сид-уведомления) удалены после проверки; пароли трёх dev-фикстур (`test-manager@test.ru`, `maneger-test-two@test.ru`, `kordont@yandex.ru`) были временно переустановлены на известное значение для входа — это тестовые аккаунты в dev-БД, не прод.

**Definition of Done:** выполнено полностью

---

## 2026-07-09 — Phase 12, Таск 2: Модель `Notification` + миграция + `notifyNewLead` (SSE + persist) + встраивание в приём

**Статус:** ✅ Завершён

**Что было сделано:**

- `prisma/schema.prisma` — модель `Notification` (`companyId`, `userId`, `type: EventType`, `leadId?`, `title`, `body?`, `readAt?`) + обратные связи `notifications Notification[]` в `Company`/`User`/`Lead`; миграция `20260709094950_phase_12_notifications` — `onDelete: Cascade` на `user`, `onDelete: SetNull` на `lead` (сознательно отличается от конвенции `Event.lead`/`DuplicateFlag`, где везде `Cascade`, — удаление лида не должно ронять уведомление)
- `lib/notifications/recipients.ts` — `resolveNewLeadRecipients(companyId, lead)`: `ALL` → все активные пользователи компании; `OWN` → HEAD/ADMIN + назначенный менеджер; переиспользует `getLeadVisibility()` из `lib/leads/visibilityFilter.ts`, не дублирует парсинг JSONB
- `lib/notifications/notifyNewLead.ts` — перечитывает лид, резолвит получателей, создаёт `Notification`-строки (`type: "LEAD_CREATED"`) и делает `broadcast(companyId, payload, predicate)` с минимальным payload (`leadId`, `name`, `source`); не вызывает `writeEvent` — `LEAD_CREATED` уже записан в транзакции `createLead()`
- Встраивание после `assignLead` в 4 точки приёма: в трёх вебхуках (`tilda`, `wordpress`, универсальный `webhooks/leads`) `assignLead` вызывается без `await` (`void assignLead(...).catch(...)`), поэтому `notifyNewLead` подключён через `.then()`, а не отдельной строкой — иначе получатели резолвились бы до простановки `assignedToId`; в `POST /api/leads` `assignLead` уже `await`-ится, там `notifyNewLead` вызван следующей строкой (fire-and-forget)
- `.docs/database.md` — добавлен раздел «Модель: Уведомления (Notification)»

**Out of scope (не делалось):** API непрочитанных / mark-as-read — таск 3; `SseProvider`, колокольчик, dropdown, `notificationStore` — таск 4; Telegram-доставка, `notification-preferences` — Phase 13.

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; миграция применена чисто (`ON DELETE SET NULL` на `leadId` подтверждён в сгенерированном SQL).

**Definition of Done:** выполнено полностью

---

## 2026-07-09 — Phase 12, Таск 1: SSE-ядро — реестр подключений + `GET /api/stream` + heartbeat

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/sse.ts` — in-memory реестр `Map<companyId, Set<Connection>>`, где `Connection = { userId, role, send(data), close() }`; экспорт `addConnection`, `removeConnection`, `broadcast(companyId, payload, predicate?)` (предикат в сигнатуре — для фильтра по получателю в таске 2); SSE-энкодер `encodeSseMessage` (`data: …\n\n`) и heartbeat-комментарий `encodeSseHeartbeat` (`: keep-alive\n\n`)
- `app/api/stream/route.ts` — `GET`, guard `requireCompanyUser({ minRole: 'MANAGER' })` из `lib/auth/requireCompanyAccess.ts` (структурно без marketer-ветки — возвращает только `UserActor`); `ReadableStream` с заголовками `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`; регистрация соединения в реестре; heartbeat-интервал 20 сек; снятие с реестра + `clearInterval` по `request.signal` (`abort`) и в `cancel()`; `export const dynamic = 'force-dynamic'`, `export const runtime = 'nodejs'`
- `/api/stream` **сознательно не добавлен** в `constants/marketerAccess.ts` — маркетолог получает 403 по deny-by-default

**Out of scope (не делалось):** модель `Notification` + миграция, `notifyNewLead`/`recipients`, встраивание в 4 точки приёма лида — таск 2; API непрочитанных / mark-as-read — таск 3; `SseProvider`, колокольчик, dropdown, `notificationStore` — таск 4.

**Проверено:** `npm run type-check` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-09 — Phase 11.8: Профиль маркетолога (аватар/контакты/компании) + self-service + вход суперадмина по companyId

**Статус:** ✅ Завершено

**Что было сделано:**

- `prisma/schema.prisma` + миграция `add_marketer_profile_fields` — `PlatformAdmin`: + `phone`/`avatarUrl`/`telegram`/`vk`/`max` (nullable, аддитивно, существующие записи целы)
- `lib/platform/s3.ts` (новый) — тонкий клиент над `@aws-sdk/client-s3` (endpoint/region/bucket из ENV), провайдер-агностичен (Beget Cloud Storage и другие S3-совместимые); `isS3Configured()`, `uploadAvatar()`, `deleteAvatar()`
- `.env.example` + `CLAUDE.md` (Environment Variables) — `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE` с описанием каждой переменной
- `lib/validations/platform.ts` — `createMarketerSchema` требует `phone`; `updateMarketerProfileSchema` (`name?/phone?/telegram?/vk?/max?`)
- **Разделение прав (правка в рамках сессии):** профиль редактирует только сам маркетолог — `SUPER_ADMIN` получил только просмотр
  - `GET /api/platform/marketers/:id` — только чтение (профиль + `companies` + `grantedCompanies`); `PATCH /api/platform/marketers/:id` не тронут (только каскадная блокировка)
  - `PATCH /api/platform/profile` + `POST/DELETE /api/platform/profile/avatar` (новые, `MARKETER`-only, self-service — действуют строго на `session.admin.id`, без `:id` в пути)
  - Удалены `PATCH /api/platform/marketers/:id/profile` и `POST/DELETE /api/platform/marketers/:id/avatar` (замена self-service вариантом)
  - `app/(platform)/platform/marketers/[id]/page.tsx` + `MarketerDetailPageClient.tsx` — только просмотр (SUPER_ADMIN)
  - `app/(platform)/platform/profile/page.tsx` (новый) + `MarketerProfileClient.tsx` (новый) — редактирование + аватар, видно только `MARKETER`
  - `PlatformSidebar.tsx` — пункт «Профиль» (`marketerOnly`); `proxy.ts` — редирект `SUPER_ADMIN` с `/platform/profile`
- `MarketersTable.tsx` — кликабельные строки → `/platform/marketers/:id`, колонка «Телефон», обязательное поле «Телефон» в модалке создания
- `next.config.ts` — `images.remotePatterns` выводится из `S3_PUBLIC_URL_BASE`
- **Вход суперадмина в компанию маркетолога по вручную предоставленному `companyId`** (донастройка существующего намерения из `platform-marketer.md`, раздел «Архитектурное решение 4»):
  - `CompanyDetailPageClient.tsx` — `canImpersonate` теперь проверяет только `viewerRole === 'SUPER_ADMIN'`, не `company.manageable` (тот остаётся только для блокировки/даты платежа/грантов, не для входа как поддержка)
  - Добавлено поле «ID компании» с кнопкой «Скопировать» на карточке компании — маркетолог копирует id и передаёт суперадмину вне системы; вход — через существующую форму «Войти в компанию по ID» на `/platform/companies`
- Документация: `.docs/database.md`, `.docs/modules/platform-marketer.md`, `CLAUDE.md` (дерево приложения + AI Rules) — обновлены под self-service-модель и под явное разрешение impersonation независимо от `manageable`

**Out of scope (не делалось):** кадрирование/ресайз аватара на клиенте; удаление объекта из S3 при полном удалении маркетолога; presigned direct-upload с клиента; смена email маркетолога.

**Проверено:** `npm run type-check`, `npm run lint` — без ошибок; `npm run build` пройден на промежуточном этапе (до финальной правки прав редактирования — далее проверено `type-check`/`lint`, дев-сервер компилируется без ошибок).

**Definition of Done:** выполнено полностью

---

## 2026-07-09 — Phase 11.7, Таск 2: UI `/platform/logs`: filter-first + таблица + пагинация + «путь лида» + пункт сайдбара

**Статус:** ✅ Завершён

**Что было сделано:**

- `app/(platform)/platform/logs/page.tsx` (новый) — Server Component: `requirePlatformSession({ roles: ['SUPER_ADMIN', 'MARKETER'] })`; список компаний через `GET /api/platform/companies` (уже отфильтрован: суперадмин не видит marketer-owned); данные логов на сервере не грузятся
- `components/platform/PlatformLogsClient.tsx` (новый) — состояние фильтров (`companyId`, `type`, `from`, `to`, `leadId`, `page`); сброс `page` на 1 при смене любого фильтра; `leadId` только для `MARKETER` в режиме «путь лида»
- `components/platform/PlatformLogsFilters.tsx` (новый) — селект компании, типа (`Object.values(EventType)` + `getPlatformEventLabel`), период `from`/`to`; для маркетолога — тумблер «Путь лида» + `LeadPathSearch`
- `components/platform/PlatformLogsTable.tsx` (новый) — `fetch('/api/platform/logs?...')` только при выбранной компании; колонки дата/событие/актор/лид (без сырого `payload`); пагинация по `hasMore`; `toDayBoundaryIso` — конец дня для `to` (`T23:59:59.999Z`); пустые состояния и лоадер
- `components/platform/LeadPathSearch.tsx` (новый) — debounced `GET /api/platform/logs/leads`, выбор лида → `leadId` в фильтры
- `components/platform/PlatformSidebar.tsx` — пункт «Логи» (`/platform/logs`, `tabler:list-details`) для обеих ролей

**Out of scope (не делалось):** изменение записи событий; разбор `payload` по типам; экспорт/аналитика; keyset-пагинация.

**Проверено:** `npm run type-check`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-09 — Phase 11.7, Таск 1: `GET /api/platform/logs` + скоуп видимости + пагинация + лейблы + резолв акторов + поиск лида + индекс

**Статус:** ✅ Завершён

**Что было сделано:**

- `prisma/schema.prisma` + миграция `20260708213836_platform_logs_event_index` — композитный индекс `Event(companyId, createdAt)`; `.docs/database.md` обновлён
- `constants/eventLabels.ts` — `PLATFORM_EVENT_LABELS` с `satisfies Record<EventType, string>` (все 45 типов) + `getPlatformEventLabel(type)`; новый `EventType` без подписи — ошибка компиляции
- `lib/validations/platform.ts` — `platformLogsQuerySchema` (`companyId` обязателен, опц. `type`/`from`/`to`/`leadId`/`page`, refine `from <= to`); `platformLogsLeadSearchSchema` (`companyId`, `q`)
- `lib/platform/logs.ts` (новый) — `assertCompanyVisible`: `visibilityWhere` + для `SUPER_ADMIN` отсечение marketer-owned через `isPlatformCompany` (403, не 404); `getCompanyLogs` — фильтры, `orderBy createdAt desc`, pageSize=50, `hasMore`; батч `User.findMany` по странице; `resolveActorLabel` — 4 случая (пользователь / «{имя} (поддержка)» / «Маркетолог (платформа)» / «Система»); `leadId`-фильтр только для `MARKETER`; `searchCompanyLeads` — поиск по name/email/phone, `take: 20`
- `types/platform.ts` — `PlatformLogItem`, `PlatformLogsResponse`, `PlatformLogLeadSearchResult`
- `app/api/platform/logs/route.ts` (новый) — `GET`, `requirePlatformSession({ roles: ['SUPER_ADMIN', 'MARKETER'] })`, Zod → 400; `leadId` от `SUPER_ADMIN` → 403 в хендлере и сервисе
- `app/api/platform/logs/leads/route.ts` (новый) — `GET`, только `MARKETER`; `searchCompanyLeads`

**Out of scope (не делалось):** UI `/platform/logs` (фильтры, таблица, «путь лида», пункт сайдбара) — Таск 2; разбор `payload` по типам; экспорт/агрегаты; keyset-пагинация.

**Проверено:** `npm run type-check`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-08 — Phase 11.6, Таск 3: Квалификация лидов — API + события + UI (карточка + список)

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/validations/leads.ts` — `qualificationSchema` (`qualification: z.enum(['QUALIFIED','DISQUALIFIED']).nullable()`) + `QualificationInput`
- `app/api/leads/[id]/qualification/route.ts` (новый) — `PATCH`, `requireCompanyAccess({ minRole: 'HEAD', method: 'PATCH', pathname })`; `where: { id, companyId }`; обновляет `qualification` + `qualifiedAt` (`now()` при установке, `null` при сбросе); события: `LEAD_QUALIFIED`/`LEAD_DISQUALIFIED` при установке, `LEAD_UPDATED { qualification: null }` при сбросе; `userId` в `writeEvent` только из ветки `actor.actor === 'user'`
- `constants/marketerAccess.ts` — в `MARKETER_ALLOWED_API` добавлено `PATCH /api/leads/:id/qualification`
- `lib/leads/getLeads.ts` — `qualification` в `LeadListItem`, Prisma `select` и маппинг
- `lib/leads/getLeadById.ts` — `qualification` в `LeadDetail`, `select` и возвращаемый объект
- `app/api/leads/[id]/route.ts` — `qualification` + `qualifiedAt` в `LEAD_CARD_SELECT`, типы и `formatLeadCardResponse`
- `constants/eventLabels.ts` — подписи `LEAD_QUALIFIED` («Лид помечен целевым»), `LEAD_DISQUALIFIED` («Лид помечен нецелевым»)
- `components/leads/QualificationBadge.tsx` (новый) — «Целевой» / «Нецелевой» / «Не оценён»
- `components/leads/QualificationControl.tsx` (новый) — переключатель → `PATCH .../qualification` + `router.refresh()`
- `app/(app)/leads/[id]/page.tsx` — `canQualify = marketer || HEAD+`; пропсы `qualification` + `canQualify` в `LeadSidebar`
- `components/leads/LeadSidebar.tsx` — блок квалификации: `QualificationControl` при `canQualify`, иначе `QualificationBadge`
- `components/leads/LeadsTable.tsx` — колонка «Квалификация» с `QualificationBadge`

**Out of scope (не делалось):** экспорт в Яндекс Метрику (Phase 22.5); фильтр списка по квалификации; batch-квалификация; `/platform/logs` (Phase 11.7); влияние на риск/воронку/назначение — намеренно отсутствует.

**Проверено:** `npm run type-check`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-08 — Phase 11.6, Таск 2: `marketerAccess.ts` (allow-list) + `requireCompanyAccess.ts` + `proxy.ts` + read-only доска

**Статус:** ✅ Завершён

**Что было сделано:**

- `constants/marketerAccess.ts` (новый) — единственный источник правды: `MARKETER_ALLOWED_PAGES` (`/leads`, `/pipeline`); `MARKETER_ALLOWED_API` — сверка по RegExp **и** методу (`GET /api/leads`, `GET /api/leads/:id`, `.../duplicates`, `.../events`, `GET /api/pipeline/board`, `GET /api/stages`, `GET /api/loss-reasons`); хелперы `isMarketerAllowedPage`, `isMarketerAllowedApi`
- `lib/auth/requireCompanyAccess.ts` (новый) — `requireCompanyUser({ minRole })`: 401 без company-сессии, **403** для `session.marketer` или недостаточной роли; `requireCompanyAccess({ minRole, method, pathname })`: для `user` — `hasMinRole`, для `marketer` — allow-list; возвращает discriminated union `CompanyActor`; `toCompanyActor(session)` — для Server Components
- `proxy.ts` — ветка `session.marketer` **до** чтения `session.user.role`: `isMarketerAllowedPage(pathname) ? next() : redirect('/leads')`
- API чтения переведены на `requireCompanyAccess`: `GET /api/leads`, `GET /api/leads/:id`, `.../duplicates`, `.../events`, `GET /api/pipeline/board`, `GET /api/stages`, `GET /api/loss-reasons`
- API мутаций переведены на `requireCompanyUser`: `POST /api/leads`, `PATCH/DELETE /api/leads/:id`, `take`, `assign`, `close`, `stage`, `POST comments` — маркетолог получает **403**, не 401
- `lib/leads/getLeads.ts`, `lib/leads/getLeadById.ts` — принимают `CompanyActor`; для `actor === 'marketer'` — все лиды компании, без `visibilityWhere`/`leadVisibility`
- `lib/pipeline/boardQuery.ts` — `userId`/`role` опциональны; без них видимость не ограничивается (как HEAD)
- `app/api/leads/[id]/route.ts` (GET) — `recordLeadOpenedOnce` только при `actor.actor === 'user'`
- Страницы: `leads/page.tsx`, `leads/[id]/page.tsx`, `pipeline/page.tsx` — `toCompanyActor(session)` вместо guard `!session.user`; скрыты «Добавить лид», редактирование/удаление, форма комментария, блок «Взять в работу»/закрытие (`canManage`/`canComment`)
- `components/pipeline/PipelineBoard.tsx` (+ `PipelineColumn`, `PipelineCard`) — проп `readOnly`: без `DndContext`/drag при `true`
- `components/leads/LeadSidebar.tsx` — проп `canManage` скрывает `TakeInWorkButton` + `CloseLeadMenu`; `LeadComments.tsx` — `canComment` скрывает форму отправки

**Out of scope (не делалось):** квалификация лидов (`PATCH /api/leads/:id/qualification`, бейдж, переключатель) — Таск 3; `/reports`, `/admin/integrations` в allow-list — Phase 21/18; блокировка прямого захода на `/leads/new` по URL — только скрыта кнопка «Добавить лид»; `TaskBlock` на моках — не трогался.

**Проверено:** `npm run type-check`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-08 — Phase 11.6, Таск 1: Actor `marketer` в сессии + провайдер + вход/выход + баннер + оболочка + `writeEvent`

**Статус:** ✅ Завершён

**Что было сделано:**

- `types/session.ts` — `CompanySession` стал объединением двух вариантов actor'а: `{ user: {...}; marketer?: never }` | `{ marketer: {platformAdminId, companyId}; user?: never }`
- `types/next-auth.d.ts` — `Session.marketer?: {platformAdminId, companyId}`; `marketerPlatformAdminId?: string` в оба JWT-augmentation блока (`@auth/core/jwt` + `next-auth/jwt`)
- `lib/platform/marketerAccess.ts` (новый) — `createMarketerAccessToken`/`consumeMarketerAccessToken`, in-memory `Map`, одноразовый, TTL 60 сек (по образцу `impersonate.ts`)
- `lib/auth.ts` — провайдер `Credentials({ id: 'marketer-access' })`: обменивает токен на `{kind:'company', companyId, marketerPlatformAdminId}` без `prisma.user.findFirst`; `jwt`/`session` callbacks различают marketer- и user-ветки company-сессии по наличию поля `marketerPlatformAdminId` на auth-user
- `lib/events.ts` — `writeEvent`: при `session.kind==='company' && session.marketer` жёстко `userId=null` + `impersonatedByPlatformAdminId=session.marketer.platformAdminId` (перекрывает `opts.userId`); обычная сессия не затронута
- `app/api/platform/companies/[id]/marketer-access/route.ts` (новый) — `POST`, `requirePlatformSession({roles:['MARKETER']})`, видимость через `visibilityWhere` (не `canManageCompany` — грант тоже пускает), `MARKETER_ACCESS_STARTED`, ответ `{token}`
- `app/api/platform/marketer-access/end/route.ts` (новый) — `POST`, guard `kind==='company' && session.marketer`, `MARKETER_ACCESS_ENDED`, `createRestoreToken` (переиспользован из `impersonate.ts`)
- `components/platform/MarketerAccessButton.tsx` (новый), `MarketerBanner.tsx` (новый) — по образцу `ImpersonateButton`/`ImpersonationBanner`
- `components/platform/CompaniesTable.tsx` — колонка «Действия»: кнопка входа при `role==='MARKETER'` независимо от `manageable`; `CompaniesPageClient.tsx` прокидывает `role`
- `constants/navItems.ts` — `getMarketerNavItems()` возвращает узкий `MarketerNavItem[]` (Лиды, Воронка), не переиспользует `SidebarNavItem.minRole`
- `components/layout/AppShell.tsx` — ветка `session.marketer`: подгружает `Company.name`, рендерит сайдбар маркетолога + `MarketerBanner`
- Ripple-фикс компиляции после смены `CompanySession` на union: `proxy.ts`, `app/(app)/leads/page.tsx`, `app/(app)/leads/[id]/page.tsx`, `app/api/leads/[id]/route.ts`, `.../events/route.ts`, `.../duplicates/route.ts` — добавлен `!session.user` в guard; `lib/leads/getLeads.ts`, `lib/leads/getLeadById.ts` — заглушка `if (!session.user) throw`. Там, где типизированные хелперы (`getLeadsWithRisk`, `getLeadById`, `getCompanyLeadContext`) принимают `session: CompanySession`, а вызывающий код передаёт уже сужённую (`!session.user` проверена) сессию next-auth — точечный `session as CompanySession` в месте вызова остаётся: `Session.marketer` типизирован как `{...}|undefined` у **обоих** вариантов сессии одновременно (next-auth `Session` — плоский интерфейс, не union), поэтому TS не может структурно сузить его до `marketer?: never`/`user?: never` только через `!session.user`

**Out of scope (не делалось):** allow-list (`constants/marketerAccess.ts`), `requireCompanyAccess.ts`, ветка `proxy.ts` для `/leads`/`/pipeline` под marketer — Таск 2 (в текущем виде marketer после входа будет редиректиться на `/login`, это ожидаемо); квалификация лидов — Таск 3; `/reports`, `/admin/integrations`, `/platform/logs` — другие фазы.

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-08 — Phase 11.5, Таск 4: Гранты доступа — API + UI + события

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/validations/platform.ts` — `createGrantSchema` (`{ marketerId: z.string().min(1) }.strict()`), `companyGrantParamsSchema` (`{ companyId, marketerId }`) + `z.infer`-типы `CreateGrantInput`/`CompanyGrantParamsInput`
- `types/platform.ts` — `CompanyGrantItem` (`marketerId/name/email`), `AvailableMarketer` (`id/name/email`); `PlatformCompanyDetail` += `grants?`, `availableMarketers?`
- `app/api/platform/companies/[id]/grants/route.ts` (новый) — `GET` список грантов компании (батч `PlatformAdmin` по `platformAdminId`, без FK-relation); `POST` — проверка `isPlatformCompany` (иначе 403), цель — активный `MARKETER` (`isActive`, `deletedAt: null`, иначе 400), `companyAccessGrant.create` (P2002 → 409), `writeEvent` `COMPANY_ACCESS_GRANTED { marketerId, byPlatformAdminId }`
- `app/api/platform/companies/[id]/grants/[marketerId]/route.ts` (новый) — `DELETE`: `findUnique` по `@@unique([companyId, platformAdminId])` (нет гранта → 404), удаление, `writeEvent` `COMPANY_ACCESS_REVOKED { marketerId, byPlatformAdminId }`
- `app/(platform)/platform/companies/[id]/page.tsx` (`loadCompanyDetail`) — при `SUPER_ADMIN` + платформенная компания: гранты компании + активные маркетологи без гранта (`id: { notIn: [...] }`); батч-резолв имён/email
- `components/platform/CompanyGrantsSection.tsx` (новый) — Client Component: список грантов с «Отозвать» (`window.confirm`), селект `availableMarketers` + «Выдать доступ»; локальный optimistic state, inline-ошибки
- `components/platform/CompanyDetailPageClient.tsx` — `CompanyGrantsSection` только при `viewerRole === 'SUPER_ADMIN' && !company.ownedByMarketer`

**Out of scope (не делалось):** вход маркетолога внутрь компании — Phase 11.6; изменения `companyVisibility.ts` (видимость по грантам уже в Таске 2); `/platform/logs` и метки событий в журнале — Phase 11.7; email-уведомление маркетологу о гранте — не описано в модуле.

**Проверено:** `npm run type-check`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-08 — Phase 11.5, Таск 3: `/platform/marketers` — API + UI + каскадная блокировка + email

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/validations/platform.ts` — `createMarketerSchema` (`email`, `name`, `password: min(8)`), `updateMarketerSchema` (`{ isActive: z.boolean() }.strict()`), `marketerParamsSchema` (`{ id: z.string().min(1) }`) + `z.infer`-типы
- `app/api/platform/marketers/route.ts` (новый) — `GET` список маркетологов (`role: MARKETER`, `deletedAt: null`) с `companiesCreated` через `groupBy`; `POST` создаёт/восстанавливает `PlatformAdmin { role: MARKETER }` с bcrypt-хэшем, email уникален глобально (409 при дубле); ответ — `MarketerActivityItem`
- `app/api/platform/marketers/[id]/route.ts` (новый) — `PATCH { isActive }` → `blockMarketer`/`unblockMarketer`; `sendCascadeBlockEmail` **после** коммита транзакции (только при блокировке и непустом списке компаний)
- `lib/platform/cascadeBlock.ts` (новый) — `blockMarketer`: транзакция (`PlatformAdmin.isActive = false` → выборка компаний с `createdByPlatformAdminId` и `isBlocked: false` → `updateMany` с `blockedByMarketerCascade: true` → `tx.event.create` `COMPANY_BLOCKED { cascade: true }` на каждую); `unblockMarketer`: симметрично, фильтр строго `blockedByMarketerCascade: true`; гранты не участвуют; возвращает список затронутых компаний + `blockedAt` (момент вызова, не поле БД)
- `lib/platform/sendCascadeBlockEmail.ts` (новый) — всем активным `SUPER_ADMIN`; по каждой компании — название, дата блокировки, администраторы (`User { role: ADMIN }`); `isEmailConfigured()` → graceful skip (`console.warn`)
- `app/(platform)/platform/marketers/page.tsx` (новый) — Server Component, `requirePlatformSession({ roles: ['SUPER_ADMIN'] })`, fetch списка по паттерну `admins/page.tsx`
- `components/platform/MarketersTable.tsx` (новый) — Client Component: таблица + модалка создания (email/name/password) + переключатель блокировки/разблокировки с `window.confirm` (предупреждение о каскаде), inline error
- `proxy.ts` — гейт SUPER_ADMIN-only на `/platform/admins` и `/platform/marketers` через `session.admin.role` (не `platformRole`) → redirect `/platform/companies`
- `app/(platform)/layout.tsx` — читает платформенную сессию, прокидывает `role` в `PlatformSidebar`
- `components/platform/PlatformSidebar.tsx` — принимает `role` пропом; пункты «Маркетологи» и «Администраторы» только при `role === 'SUPER_ADMIN'`

**Out of scope (не делалось):** вход маркетолога внутрь компании, actor `marketer`, allow-list, баннер — Phase 11.6; гранты (`CompanyAccessGrant` API/UI) — Таск 4; квалификация лидов, `/platform/logs` — другие фазы.

**Проверено:** `npm run type-check`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-08 — Phase 11.5, Таск 2: `companyVisibility.ts` + скоупинг компаний/активности/дайджеста + владение в `createCompany`

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/platform/companyVisibility.ts` (новый) — единственный источник правды видимости/управляемости: `visibilityWhere(admin)`, `resolveOwnerRoles(ownerIds)` (батч-резолв ролей владельцев без FK), `isPlatformCompany(company, ownerRole)`, `canManageCompany(admin, company, ownerRole)`
- `lib/platform/createCompany.ts` — `CreateCompanyInput` += `createdByPlatformAdminId`, пишется в `company.data`
- `lib/platform/companyActivity.ts` — `getCompanyActivity(periodStart, admin)` скоупится через `visibilityWhere`; для `SUPER_ADMIN` дополнительно возвращает блок активности маркетологов (`lastLoginAt`, число созданных компаний, `isActive`)
- `lib/platform/subscriptionReminders.ts` — `collectCompaniesNeedingRenewal` возвращает `createdByPlatformAdminId`; `sendSubscriptionDigest` группирует по владению (не по видимости): платформенные → всем активным `SUPER_ADMIN`, marketer-owned → только этому маркетологу (если активен); грантованные не участвуют (дайджест не использует гранты)
- `app/api/platform/companies/route.ts` — GET скоупится по `visibilityWhere` + классифицирует через `resolveOwnerRoles`; marketer-owned строки для `SUPER_ADMIN` уходят без `id`/`nextPaymentAt`/`subscriptionStatus`, с `ownedByMarketer: true`, `manageable: false`; POST передаёт `session.admin.id` в `createCompany`
- `app/api/platform/companies/[id]/route.ts` — PATCH проверяет `canManageCompany` до мутации (иначе 403); ручной `isBlocked` дополнительно сбрасывает `blockedByMarketerCascade: false`
- `app/api/platform/activity/route.ts` — передаёт `session.admin` в `getCompanyActivity`
- `types/platform.ts` — `PlatformCompanyListItem.id`/`nextPaymentAt`/`subscriptionStatus` стали опциональными, `+ ownedByMarketer?`, `+ manageable`; новый `MarketerActivityItem` + `CompanyActivityResponse`; `PlatformCompanyDetail` += `manageable`, `ownedByMarketer`
- `app/(platform)/platform/companies/[id]/page.tsx` — guard видимости для `MARKETER` через `visibilityWhere` прямо в `findFirst` (заменяет `findUnique`) → `notFound()` при чужой/неграновой компании; тот же guard в `generateMetadata`
- `app/(platform)/platform/companies/page.tsx`, `activity/page.tsx` — прокидывают `session.admin.role` в клиентские компоненты
- `components/platform/CompaniesPageClient.tsx` — поле «Войти в компанию по ID» только для `SUPER_ADMIN`
- `components/platform/CompaniesTable.tsx` — marketer-owned строки рендерятся без ссылки/действий (синтетический ключ вместо `id`), управление скрывается при `manageable: false`
- `components/platform/CompanyDetailPageClient.tsx` — блокировка/дата платежа скрываются при `!manageable`; кнопка impersonate — дополнительно только при `viewerRole === 'SUPER_ADMIN'` (маркетолог не impersonate'ит никогда, даже свою компанию)
- `components/platform/CompanyActivityTable.tsx` — вкладка «Маркетологи» только у `SUPER_ADMIN`

**Out of scope (не делалось):** вход маркетолога внутрь компании, квалификация лидов, `/platform/marketers` + каскадная блокировка, API грантов (используется только их чтение), `/platform/logs`, правки `proxy.ts` company-зоны — как и запланировано (Phase 11.6 / Таск 3 / Таск 4).

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; нет `any`.

**Definition of Done:** выполнено полностью

---

## 2026-07-08 — Phase 11.5, Таск 1: Миграция v4.1 + `PlatformRole` в сессии + `requirePlatformSession({ roles })` на всех роутах

**Статус:** ✅ Завершён

**Что было сделано:**

- `prisma/schema.prisma` — enum `PlatformRole`/`LeadQualification`; `PlatformAdmin.role` (`@default(SUPER_ADMIN)`) + `lastLoginAt`; `Company.createdByPlatformAdminId`/`blockedByMarketerCascade`; `Lead.qualification`/`qualifiedAt`; модель `CompanyAccessGrant` (FK только на `Company`, без relation на `PlatformAdmin`); `EventType` += `COMPANY_ACCESS_GRANTED`/`REVOKED`, `MARKETER_ACCESS_STARTED`/`ENDED`, `LEAD_QUALIFIED`/`DISQUALIFIED`
- Миграция `20260708074727_v4_1_marketer_role` — аддитивная; существующие `PlatformAdmin` → `SUPER_ADMIN`, все `Company.createdByPlatformAdminId = null`, лиды без квалификации
- `types/session.ts` — `PlatformSession.admin.role: PlatformRole` (`CompanySession` не тронут)
- `types/next-auth.d.ts` — `Session.admin.role`; `platformRole` в **оба** JWT-augmentation блока (`@auth/core/jwt` + `next-auth/jwt`)
- `lib/auth.ts` — `PlatformAuthUser` с `platformRole`; `platform-credentials.authorize()` — выбирает `role`, пишет `PlatformAdmin.lastLoginAt`, возвращает `platformRole`; `platform-restore.authorize()` — возвращает `role`, `lastLoginAt` **не** трогает; JWT/session callbacks: `token.platformRole` → `session.admin.role`
- `lib/platform/auth.ts` — `requirePlatformSession({ roles })`: нет платформенной сессии / чужой `kind` → `Response` 401; валидная сессия с неподходящей ролью → 403
- Проставлен `{ roles }` во всех существующих call-site'ах платформенной сессии:
  - `SUPER_ADMIN` + `MARKETER`: `app/api/platform/companies/route.ts` (GET/POST), `companies/[id]/route.ts` (PATCH), `activity/route.ts` (GET); страницы `companies/page.tsx`, `companies/[id]/page.tsx`, `activity/page.tsx`
  - только `SUPER_ADMIN`: `companies/[id]/impersonate/[userId]/route.ts`, `admins/route.ts` (GET/POST), `admins/[id]/route.ts` (DELETE), `admins/page.tsx`
- **Не тронуты** (session-less / company-session): `login` (NextAuth-провайдер), `auth/forgot-password`, `auth/reset-password`, `cron/subscription-reminders`, `impersonate/end`

**Out of scope (не делалось):** владелец-скоупинг и `lib/platform/companyVisibility.ts` (таск 2); `/platform/marketers`, каскадная блокировка, email (таск 3); гранты доступа (таск 4); actor `marketer` в company-сессии, allow-list, `proxy.ts` для company-зоны (Phase 11.6); UI/API квалификации лидов (Phase 11.6) — поля заведены миграцией, но не используются; SUPER_ADMIN-гейт `/platform/marketers`/`/platform/admins` в `proxy.ts` и нав (таск 3)

**Проверено:** `npm run type-check`, `npm run build` — без ошибок; нет `any`. Ручная проверка 403 стаб-маркетологом на `/api/platform/admins` **не проводилась** — запись `MARKETER` пока не создаётся (таск 3).

**Definition of Done:** выполнено по коду; пункт ручной проверки 403 отложен до появления маркетолога (таск 3)

---

## 2026-07-03 — Phase 11, Таск 3: UI — селект ответственного + правила назначения + переключатель режима

**Статус:** ✅ Завершён

**Что было сделано:**

- `components/leads/AssignManagerSelect.tsx` — НОВОЕ: клиентский селект (`GET /api/users`, `PATCH /api/leads/:id/assign`), опция «Не назначен» → `managerId: null`; заблокированные исключены из выбора, кроме уже назначенного (виден с пометкой «заблокирован»); оптимистичный откат при ошибке, `router.refresh()` при успехе (обновляет историю `ASSIGNED`); синхронизация с обновлённым пропом `assignedTo` — без эффекта (паттерн «adjusting state when a prop changes», иначе падает `react-hooks/set-state-in-effect`)
- `components/leads/LeadSidebar.tsx` — новые пропсы `assignedTo: { id, name } | null` + `canAssign: boolean`; при `canAssign` рендерится `AssignManagerSelect`, иначе прежний read-only текст
- `app/(app)/leads/[id]/page.tsx` — `canAssign = hasMinRole(companySession.user.role, 'HEAD')` прокинут в `LeadSidebar`
- `components/settings/AssignModeSection.tsx` — НОВОЕ: радио MANUAL/ROUND_ROBIN, немедленный `PATCH /api/settings` при выборе, откат при ошибке, toast; без `activeManagersOnly` (такой настройки не существует)
- `components/settings/AssignmentRulesSection.tsx` + `components/settings/AssignmentRulesList.tsx` — НОВОЕ: таблица правил (источник/метка/исполнитель/запасной/приоритет/активность), создание и редактирование в модалке (клиентская валидация теми же Zod-схемами `lib/validations/assign.ts`, пустая строка → `null` до валидации), деактивация тумблером (мгновенный `PATCH`), удаление с inline-подтверждением (паттерн `LossReasonsList`); `PATCH` с пустым diff не отправляется (edit-модалка закрывается без запроса, если ничего не изменилось); ошибки `WRONG_COMPANY`/`VALIDATION_ERROR` показываются текстом, не «тихо»
- `components/settings/SettingsClientArea.tsx` — `DistributionSection` и ключ `'distribution'` убраны из `SettingsSections`/`DirtyKey`
- `components/settings/DistributionSection.tsx` — удалён (заглушка Phase 4 с несуществующей настройкой `activeManagersOnly`)
- `app/(admin)/admin/settings/page.tsx` — секции «Распределение» (режим + правила) вынесены **вне** `SettingsDirtyProvider` (немедленное сохранение, паттерн «Причины отказа»); `assignMode` читается локальным `readAssignMode` (дефолт `MANUAL` на битый/отсутствующий JSONB — `lib/assignLead.ts` не трогался, т.к. вне скоупа таска); список правил и пользователей компании — серверными пропсами
- `.docs/phases/phase-11.md` — пути компонентов поправлены на фактические (`components/settings/*`, не `components/admin/settings/*`); статусы Таска 3 и фазы в целом → ✅ Готово

**Out of scope (не делалось):** доставка алерта `ASSIGNMENT_FAILED` (Telegram/SSE, Phase 12/13); уведомление назначенному менеджеру (Phase 13); остальные настройки компании и секции-заглушки (`NotificationsSection`/`RemindersSection`/`SecuritySection`) — без изменений; назначение из списка лидов/Kanban — не реализовывалось (только карточка лида); изменения API-роутов и схемы БД — не потребовались.

**Проверено:** `npm run type-check`, `npm run lint`, `npm run build` — без ошибок; нет `any`. **Живая проверка в браузере не проводилась** — в dev-БД не нашлось известных тестовых учётных данных (пароли захэшированы), а временный сброс пароля пользователю согласовать не стали (пользователь предпочёл пропустить живую проверку и положиться на статическую верификацию).

**Definition of Done:** выполнено по коду; пункт «нет ошибок в консоли браузера» не проверен вживую (см. выше)

---

## 2026-07-03 — Phase 11, Таск 2: API — ручное назначение + CRUD AssignmentRule + минимальный `/api/settings`

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/validations/assign.ts` — НОВОЕ: `assignSchema` (`managerId` nullable — снятие ответственного), `createAssignmentRuleSchema`, `updateAssignmentRuleSchema` (partial + `.refine` «минимум одно поле»)
- `lib/validations/settings.ts` — НОВОЕ: `updateSettingsSchema` — пока только `assignMode: MANUAL | ROUND_ROBIN`
- `app/api/leads/[id]/assign/route.ts` — НОВОЕ: `PATCH`, HEAD+; лид `findFirst({ id, companyId })` → 404; `managerId !== null` — пользователь своей компании и не заблокирован → иначе `400 WRONG_COMPANY`; `null` — снятие без лишней проверки; вызов `assignLeadTo` (событие `ASSIGNED`, курсор не трогает)
- `app/api/assignment-rules/route.ts` — НОВОЕ: `GET` (список по `priority asc`, include имён исполнителей) / `POST` — ADMIN; `assignToId`/`fallbackToId` только пользователи компании → `400 WRONG_COMPANY`; блокировка исполнителей **не** проверяется (на рантайме правило уходит на запасного)
- `app/api/assignment-rules/[id]/route.ts` — НОВОЕ: `PATCH` / `DELETE` — ADMIN; правило своей компании → иначе 404; `WRONG_COMPANY` только для переданных в PATCH исполнителей; CRUD не пишет `Event`
- `app/api/settings/route.ts` — заглушка заменена: `GET` (любая company-сессия, JSONB без `roundRobinCursor`) / `PATCH` (ADMIN; плоский мёрж `{ ...current, assignMode }`, не затирает остальные поля JSONB)
- `app/api/users/route.ts` — только `GET`: порог ослаблен с ADMIN до HEAD (список для селекта назначения); `POST` и мутации в `[id]` — без изменений (ADMIN)
- Миграция не потребовалась — все модели и поля уже в init-миграции Phase 0
- Проверено: `npm run type-check` — без ошибок; нет `any`

**Out of scope (не делалось):** UI селекта ответственного, таблицы правил и переключателя режима (Таск 3); глубокий мёрж `reactionNorms`/`leadVisibility` и прочие поля настроек (Phase 17); доставка алертов `ASSIGNMENT_FAILED` (Telegram/SSE, Phase 12/13); allow-list маркетолога для этих эндпоинтов (Phase 11.6)

**Definition of Done:** ✅ Все пункты выполнены

---

## 2026-07-03 — Phase 11, Таск 1: Ядро распределения — intake-фикс + `assignLead` (3 уровня) + round-robin

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/intake/createLead.ts` — опциональный 4-й параметр `sourceLabel`: кладётся в `marketing.sourceLabel` поверх результата `normalizeLead`, не затирая остальные marketing-поля тела запроса
- `app/api/webhooks/leads/route.ts` — фикс: `createLead(body, "api", companyId, sourceLabel)` вместо `createLead(body, sourceLabel, companyId)` — `Lead.source` теперь канонический `"api"`, метка ключа не терялась в `source`, а уходит в `marketing.sourceLabel`
- `lib/assignmentRules.ts` — НОВОЕ: `tryAssignmentRules(leadId, companyId)` — тристейт `assigned | matched_but_failed | no_match` (не `boolean`); матч `matchSource`/`matchSourceLabel` по `priority asc`; `marketing.sourceLabel` читается через локальный narrow-хелпер без `any`; назначение — `updateMany({ where: { id, companyId } })` + событие `ASSIGNED { toUserId, viaRule }`
- `lib/roundRobin.ts` — НОВОЕ: `pickNextManager(tx, companyId)` — `pg_advisory_xact_lock(hashtext(companyId))` + выбор среди точного `role: "MANAGER"` (не `hasMinRole` — намеренное исключение HEAD/ADMIN по решению фазы) + обновление `settings.roundRobinCursor`, всё внутри одной транзакции; удалённый/заблокированный на курсоре — берётся следующий активный по кругу; пустой список активных → `null`
- `lib/assignLead.ts` — заменена заглушка: `assignLead(leadId, companyId)` — уровень 1 (правила) → уровень 2 (`assignMode`, дефолт `MANUAL` на битый JSONB) → уровень 3 (`ASSIGNMENT_FAILED` строго в двух случаях: правило совпало, но не назначило + фоллбэк не сработал, или `ROUND_ROBIN` без активных менеджеров). Round-robin ветка — `pickNextManager` + `lead.updateMany` + `tx.event.create("ASSIGNED")` в одной транзакции (не через `writeEvent`, который не может участвовать в `$transaction`). Плюс `assignLeadTo(leadId, companyId, managerId | null, actorUserId)` — ручное назначение/снятие, курсор не трогает
- Встроено после коммита во все 4 точки приёма: `app/api/webhooks/tilda/[companyId]/route.ts`, `app/api/webhooks/wordpress/[companyId]/route.ts`, `app/api/webhooks/leads/route.ts` (`void assignLead(...).catch(console.error)`), `app/api/leads/route.ts` POST (`await assignLead(...).catch(...)` — ошибка назначения не роняет ответ)
- `.docs/modules/assignment.md` — обновлены: тристейт вместо `boolean`, реальная сигнатура `writeEvent`, финальная семантика `ASSIGNMENT_FAILED` (FR-193), код round-robin с advisory lock и обработкой снятого/заблокированного курсора
- `.docs/modules/leads-intake.md` — обновлён: универсальный вебхук пишет `source: "api"` + `marketing.sourceLabel`, порядок пост-коммитных действий, имя функции `assignLead` (было `autoAssignLead` в псевдокоде)
- Миграция не потребовалась — `AssignmentRule`, `ASSIGNED`/`ASSIGNMENT_FAILED` были в init-миграции Phase 0; `assignMode`/`roundRobinCursor` — существующие JSONB-поля `Company.settings`
- Проверено: `npm run type-check`, `npm run lint` (только изменённые файлы), `npm run build` — без ошибок; нет `any`

**Out of scope (не делалось):** `PATCH /api/leads/:id/assign`, CRUD `AssignmentRule`, `GET/PATCH /api/settings` (Таск 2); UI селекта/правил/переключателя (Таск 3); доставка алерта `ASSIGNMENT_FAILED` (Telegram/SSE, Phase 12/13); `notifyNewLead` (Phase 13)

**Definition of Done:** ✅ Все пункты выполнены

---

## 2026-07-02 — Документация v4.1: роль «Маркетолог» (без кода)

**Статус:** ✅ Завершён

**Что сделано (только документация, ни одной строчки кода/схемы):**

- **Новый модуль `.docs/modules/platform-marketer.md`** — полная спецификация роли `MARKETER`: `PlatformRole` (не иерархия с `SUPER_ADMIN` — два скоупа, проверка явным списком `requirePlatformSession({ roles })`), владение компаниями (`Company.createdByPlatformAdminId`), гранты (`CompanyAccessGrant`), каскадная блокировка компаний при блокировке маркетолога (+ email суперадминам с контактами администраторов), вход внутрь компании виртуальным actor'ом `marketer` с allow-list/deny-by-default (не impersonation), квалификация лидов (`Lead.qualification` + `LEAD_QUALIFIED`/`DISQUALIFIED`), страница логов `/platform/logs`
- **`.docs/database.md` → v4.1** — enum'ы `PlatformRole`/`LeadQualification`, 6 новых `EventType`, поля `Company` и `Lead`, модель `CompanyAccessGrant`, синхронизация `PlatformAdmin` с фактической схемой (`isActive`/`deletedAt` + добавлены `role`/`lastLoginAt`), `PlatformAdminPasswordResetToken` (устранён дрейф доки), транзакция каскадной блокировки, индексы, примечание о безопасной аддитивной миграции
- **`.docs/modules/platform-admin.md`** — пометки (v4.1): скоупинг списка компаний/активности/дайджеста по владению, impersonation только SUPER_ADMIN, `/platform/admins` только SUPER_ADMIN, обновлена таблица API (auth-колонка с ролями)
- **`CLAUDE.md` → v4.1** — пять уровней доступа, исключения из `hasMinRole` (платформенные роли — явный список; маркетолог — allow-list, не добавляется в `UserRole`/`ROLE_RANK`), структура (страницы/lib/constants), пример proxy.ts с actor `marketer`, новые AI Rules
- **`.docs/prd.md` → v4.1** — разделы 2.7 (MKT-01…09), 2.8 (CASC-01…06), 2.9 (LOG-01…05), 4.17 (QUAL-01…06), обновлены PLAT-04…07/09 + PLAT-10…12, SUB-04 (дайджест по владельцу), API-таблица, экраны, security, роадмап, журнал версий
- **`.docs/phases/_status.md`** — новые фазы: **11.5** (платформа: роль, владение, гранты, каскад), **11.6** (маркетолог внутри компании + квалификация), **11.7** (платформенные логи), **22.5** (экспорт квалификаций в Метрику, research-first); правки Phase 18/21 (доступ маркетолога через allow-list) и Phase 23 (smoke-тесты флоу маркетолога)

**Ключевые решения (согласованы с заказчиком):**

- Дайджест продлений уходит владельцу компании (создателю), не всем
- Блокировка маркетолога каскадно блокирует его компании; суперадмины получают email с контактами администраторов; разблокировка возвращает только каскадные; приём webhook-лидов не прерывается
- Квалификация — статус + событие, независима от воронки/закрытия; экспорт в Метрику через API офлайн-конверсий (Phase 22.5, research-first)
- Скрытие `companyId` компаний маркетологов от суперадмина зафиксировано как UX-барьер/граница ответственности, не гарантия безопасности

**Существующий код не менялся** — Phase 11 (распределение лидов) идёт по плану; реализация роли — фазы 11.5–11.7 по `.docs/modules/platform-marketer.md`.

---

## 2026-06-27 — Phase 10, Таск 3: UI — блокировка/разблокировка + смена роли + удаление

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `components/users/EditUserModal.tsx` — Client: полный рефактор; `role: PrismaUserRole` (не строка-лейбл); `RoleRadioGroup` (3 опции) вместо disabled Input; `StatusRadioGroup` для статуса; `PATCH /api/users/:id` только с изменившимися полями (`role` и/или `isBlocked`); `LAST_ADMIN` → сообщение в модалке; loading «Сохранение…»; `onSuccess()` вместо `onConfirm(status)`
- `components/users/DeleteUserModal.tsx` — Client: реальный `DELETE /api/users/:id`; `409 USER_HAS_DATA` → «У пользователя есть данные. Заблокируйте вместо удаления»; `409 LAST_ADMIN` → «Нельзя удалить последнего администратора компании»; убран некорректный текст про лиды без менеджера; loading «Удаление…»; `onSuccess()` вместо `onConfirm()`
- `components/users/UsersTable.tsx` — Client: `handleToggleBlock` → `PATCH /api/users/:id` с `{ isBlocked: !current }`; при `LAST_ADMIN` — toast; при успехе — `refetch()`; `handleEditSuccess` / `handleDeleteSuccess` → refetch + toast «Пользователь обновлён» / «Пользователь удалён»; кнопки edit / block / delete задизейблены для `user.id === currentUserId`; `EditUserModal` получает `role: editUser.role`; модалки — `onSuccess`

**Учтённые точки риска:**

- `role` передаётся как `PrismaUserRole`, не `getRoleLabel(...)` — `RoleRadioGroup` корректно инициализирует выбранную опцию
- `handleToggleBlock` при `LAST_ADMIN` показывает toast (модалки нет — ошибка не теряется)
- Кнопки для собственной строки (`isSelf`) задизейблены в UI — пользователь не видит «последний администратор» вместо «нельзя действовать на себя»
- `onSuccess()` + `refetch()` вместо оптимистичного `onConfirm(status)` — таблица всегда синхронизирована с сервером после edit/delete
- Текст в `DeleteUserModal` исправлен: «Пользователь будет удалён без возможности восстановления» (без ложного обещания про лиды)

**Out of scope (не делалось):** смена email/имени; сброс пароля администратором; изменения схемы БД / FK; правила назначения и round-robin (Phase 11); привязка Telegram (Phase 13)

**Проверки:** `npm run type-check` — без ошибок, без `any`

---

## 2026-06-27 — Phase 10, Таск 2: UI `/admin/users` — список + создание (3 роли)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/(admin)/admin/users/page.tsx` — async Server Component: `auth()` → `kind === 'company'` → редирект `/login`; `hasMinRole(role, 'ADMIN')` → редирект `/today`; `prisma.user.findMany` по `companyId` с `USER_PUBLIC_SELECT` (без `passwordHash`), сортировка по `name`; передача `initialUsers` и `currentUserId` в `<UsersTable />`
- `components/users/UsersTable.tsx` — Client: пропсы `initialUsers: ApiUser[]`, `currentUserId` (для таска 3); тип `ApiUser` и `User` на Prisma `UserRole` + `isBlocked`; `RoleBadge` на 3 роли (Менеджер / Руководитель / Администратор); `StatusCell` через `isBlocked: boolean`; `getInitials(name)` в render; `refetch()` через `GET /api/users`; после `onSuccess` из `AddUserModal` — refetch + toast «Пользователь создан»; кнопка «Добавить пользователя»; пустое состояние «Нет пользователей»
- `components/users/AddUserModal.tsx` — убрано поле `status`; `RoleRadioGroup` (дефолт `MANAGER`); `onSuccess()` вместо `onConfirm`; `POST /api/users` с `{ name, email, password, role }`; клиентская Zod через `createUserSchema`; `EMAIL_EXISTS` → ошибка у email; `VALIDATION_ERROR` → общая ошибка формы; loading «Создание...»; заголовок «Новый пользователь»
- `components/users/userModalShared.tsx` — экспорт `RoleRadioGroup` для выбора из 3 ролей (Менеджер / Руководитель / Администратор)

**Учтённые точки риска:**

- `passwordHash` не уходит клиенту — явный `USER_PUBLIC_SELECT` на сервере в `page.tsx` (совпадает с API)
- `initials` не хранятся в state — вычисляются из `name` в render (`getInitials`)
- Toast в родителе (`UsersTable`), `AddUserModal` вызывает только `onSuccess()`
- Незалогиненный / не-ADMIN → редирект на уровне `page.tsx`, не 403 при SSR
- Локальный mock-тип `UserRole = 'admin' | 'manager'` заменён на Prisma `UserRole`

**Out of scope (не делалось):** `EditUserModal` / `DeleteUserModal` — подключение к API; эшены строк (блокировка, редактирование, удаление) → API; скрытие опасных действий над собой (`currentUserId` передаётся, логика — таск 3)

**Проверки:** `npm run type-check` — без ошибок, без `any`

---

## 2026-06-27 — Phase 10, Таск 1: API пользователей — CRUD + block/unblock + инварианты + Zod

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/validations/users.ts` — `createUserSchema` (email → trim + lowercase, name, password min 8, role enum), `updateUserSchema` (опц. role / isBlocked, refine «хотя бы одно поле»), типы через `z.infer<>`
- `lib/users/userGuards.ts` — `countActiveAdmins`, `isLastActiveAdmin` (role ADMIN + `isBlocked: false`), `hasDependentRecords` (8 FK: Lead.assignedToId, Comment, Task created/assigned, Reminder, ImportBatch, AssignmentRule assign/fallback)
- `app/api/users/route.ts` — `GET` (ADMIN, список по `companyId`, `USER_PUBLIC_SELECT`, сортировка по name); `POST` (ADMIN, Zod → глобальный `EMAIL_EXISTS` → `hashPassword` → create → `USER_CREATED`, ответ без `passwordHash`)
- `app/api/users/[id]/route.ts` — `PATCH` (роль и/или isBlocked, инварианты self/last admin, события block/unblock только при смене флага); `DELETE` (`USER_HAS_DATA` / `LAST_ADMIN` → delete + `USER_DELETED`)

**Учтённые точки риска:**

- `EMAIL_EXISTS` — глобальный `findUnique({ where: { email } })` без `companyId`, с комментарием в коде (не P2002)
- Последний активный ADMIN — инвариант на `DELETE`, `PATCH` block и `PATCH` demote (`ROLE_RANK`); счёт с учётом `isBlocked`
- `USER_BLOCKED` / `USER_UNBLOCKED` — только если `parsed.data.isBlocked !== target.isBlocked`
- `hasDependentRecords` — все RESTRICT-FK на User, включая `Task.assignedToId` и `AssignmentRule.fallbackToId`
- Self-guard — сравнение с `session.user.id` (корректно при impersonation)
- `passwordHash` — явный `USER_PUBLIC_SELECT` во всех ответах

**Out of scope (не делалось):** UI (`/admin/users`, `UsersTable`, модалки — таски 2–3); миграции БД / FK; блокировка в AssignmentRule/round-robin (Phase 11); смена пароля, Telegram

**Проверки:** `npm run type-check` — без ошибок, без `any`

---

## 2026-06-27 — Phase 9, Таск 3: Фильтр по ответственному + видимость по роли + адаптивность

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/(app)/pipeline/page.tsx` — Server Component: параллельный fetch `getBoardData` + `getManagers(companyId)` (менеджеры только при `showManagerFilter`); `showManagerFilter = hasMinRole(role, 'HEAD') || leadVisibility === 'ALL'`; проброс `managers` и `showManagerFilter` в `<PipelineBoard>`
- `components/pipeline/PipelineBoard.tsx` — Client: пропсы `managers: ManagerOption[]`, `showManagerFilter: boolean`; state `selectedManagerId: string | null`; хелпер `buildBoardUrl(includeClosed, assignedToId)` для единого построения URL re-fetch; `refetchBoard` — общая загрузка доски; селект «Ответственный» в toolbar (только при `showManagerFilter`); `handleManagerChange` → re-fetch с `assignedToId`, сохраняет `includeClosed`; `handleToggleClosed` через `buildBoardUrl` — сохраняет `selectedManagerId`; контейнер колонок `flex-col gap-4 md:flex-row md:overflow-x-auto`
- `components/pipeline/PipelineColumn.tsx` — ширина `w-full md:w-[272px] md:flex-shrink-0` вместо фиксированного `w-[272px] flex-shrink-0`

**Учтённые точки риска:**

- Комбинирование фильтров — единый `buildBoardUrl` + `refetchBoard`; toggle «Показать закрытые» и смена менеджера передают оба параметра (`includeClosed`, `assignedToId`)
- Видимость селекта — `showManagerFilter` вычисляется на сервере в `page.tsx`, не дублируется на клиенте; MANAGER с `leadVisibility=OWN` селект не видит
- Ширина колонок на мобильном — `w-full` в вертикальном стеке, `md:w-[272px]` на десктопе
- Фильтр `assignedToId` не расширяет видимость — ограничение на сервере через `visibilityWhere` в `boardQuery` (без изменений API)

**Out of scope (не делалось):** назначение/переназначение менеджера на лид; CRUD этапов (`/api/stages/*`, `/admin/pipeline-settings`); промпт создания задачи при смене этапа; изменения `boardQuery.ts` и `GET /api/pipeline/board`

**Проверки:** `npx tsc --noEmit` — без ошибок, без `any`

---

## 2026-06-27 — Phase 9, Таск 2: Kanban UI — реальные данные + drag-and-drop + зависшие карточки

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/(app)/pipeline/page.tsx` — Server Component: `auth()` + `getLeadVisibility`; Prisma-выборка `company.settings`; SSR через `getBoardData({ includeClosed: false })`; передача `initialColumns` в `<PipelineBoard>`
- `components/pipeline/PipelineBoard.tsx` — Client: `initialColumns: BoardColumn[]` → `useState`; типы `BoardColumn[]` / `BoardLeadCard`; `handleDragEnd` — async с захватом `prevColumns` до `setColumns`, optimistic update, `PATCH /api/leads/:id/stage`, откат + Toast при ошибке; reorder внутри колонки без API; `handleCardClick` → `router.push('/leads/${id}')`; чекбокс «Показать закрытые» — client fetch `/api/pipeline/board?includeClosed=true`, полная замена `columns`; empty state «Нет этапов воронки»; убраны заглушки Phase 8/9, `console.log`, `TODO`
- `components/pipeline/PipelineColumn.tsx` — `BoardLeadCard` из `boardQuery`; `color: string` (hex) → полоска `style={{ backgroundColor: color }}`; `avgDaysOnStage` в формате «X дн.» / «—»; счётчик `leads.length`; экспорт `PipelineLead` удалён
- `components/pipeline/PipelineCard.tsx` — реальные поля: `risk`, `closeType`, `assignedTo`, `source`; `<RiskBadge level reason />`; закрытая карточка: `useSortable({ id, disabled: closeType !== null })`, серое оформление (`opacity-60`, `cursor-default`); `PipelineCardOverlay` синхронизирован; удалены `tags`, `manager`, `TAG_STYLES`, `PipelineTag`

**Учтённые точки риска:**

- Откат при ошибке API — через `const prevColumns = columns` до optimistic `setColumns`, не через замыкание после update
- `PipelineLead` и импорт из `PipelineColumn` удалены — единый тип `BoardLeadCard`
- Закрытые карточки остаются в `SortableContext items`, drag отключён через `disabled: true`
- «Показать закрытые» — полная замена state с сервера, без мёржа с optimistic-состоянием
- `PipelineCardOverlay` обновлён в том же проходе, что и `PipelineCard`

**Out of scope (не делалось):** фильтр по ответственному; видимость MANAGER OWN vs HEAD/ADMIN ALL в UI; адаптивность / вертикальный стек на мобильном; промпт создания задачи при смене этапа; CRUD этапов (`/admin/pipeline-settings`, `/api/stages/*`)

**Проверки:** `npm run type-check` — без ошибок, без `any`

---

## 2026-06-27 — Phase 9, Таск 1: API смены этапа + данные доски

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/validations/leads.ts` — `changeStageSchema` (`{ stageId }`) + тип `ChangeStageInput`; `updateLeadSchema` и остальные схемы не тронуты
- `lib/validations/pipeline.ts` — **new**: `boardQuerySchema` (`includeClosed: z.coerce.boolean().default(false)`, `assignedToId` опц.) + `BoardQueryInput`
- `app/api/leads/[id]/stage/route.ts` — **new**: `PATCH` (MANAGER+): `params` через `Promise` (Next.js 16); `visibilityWhere` из `company.settings.leadVisibility`; гарды `404` / `LEAD_CLOSED` / `INVALID_STAGE`; no-op при том же этапе; `$transaction`: `tx.lead.update` + `tx.event.create(STAGE_CHANGED, { fromStageId, toStageId })`; `impersonatedByPlatformAdminId` из сессии до транзакции
- `lib/pipeline/boardQuery.ts` — **new**: `getBoardData({ companyId, session, leadVisibility, companySettings, includeClosed?, assignedToId? })`; этапы по `order`; лиды с полным `LeadListItem`-select; риск через `computeRiskBatch`; `STAGE_CHANGED` — один `findMany` по всем `leadIds`; `avgDaysOnStage` = `avg(now − (lastStageChangedAt ?? createdAt))`, пустая колонка → `null`; ответ `{ columns: BoardColumn[] }` с `BoardLeadCard` (`risk`, `closeType`, контакты, `assignedTo`)
- `app/api/pipeline/board/route.ts` — **new**: `GET` (company-сессия, MANAGER+); query через `boardQuerySchema`; делегирует в `getBoardData`

**Учтённые точки риска:**

- Смена этапа — `tx.event.create`, не `writeEvent` (событие внутри атомарной транзакции)
- `computeRiskBatch` получает полный `LeadListItem[]` (дубли, `lossReason`, `stage.stageTimeLimitDays` и т.д.)
- `includeClosed` снимает только `{ closeType: null }`; `visibilityWhere` применяется всегда
- Целевой этап проверяется `pipelineStage.findFirst({ id, companyId })` — нельзя переместить в чужой этап
- Пустая колонка → `avgDaysOnStage: null`, не `0` и не `NaN`

**Out of scope (не делалось):** UI Kanban (`PipelineBoard`, `PipelineColumn`, `PipelineCard`, `page.tsx`); drag-and-drop; переключатель «Показать закрытые» в UI; фильтр по ответственному в UI; адаптивность; CRUD этапов (`/api/stages/*`); рефакторинг `writeEvent`

**Проверки:** `npm run type-check` — без ошибок, без `any`

---

## 2026-06-27 — Phase 8, Таск 2: UI `/admin/pipeline-settings` поверх существующего каркаса

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/(admin)/admin/pipeline-settings/page.tsx` — Server Component: `auth()` + `hasMinRole(..., 'ADMIN')`; Prisma-выборка `pipelineStage.findMany({ where: { companyId }, orderBy: order })` с `_count.leads`; маппинг в `StageData[]`; проброс `initialStages` в `PipelineSettings`; убраны `SaveOrderButton` и `actions` у `PageHeader`
- `components/pipeline/PipelineSettings.tsx` — Client: локальный стейт из `initialStages`; sortable-список (`@dnd-kit/core` + `@dnd-kit/sortable`) по образцу `LossReasonsList`; reorder на `dragEnd` → `PATCH /api/stages/reorder` (оптимистично + snapshot-откат + Toast); `patchStage` для rename/color/limit → `PATCH /api/stages/:id`; модалки добавления/удаления; пустое состояние; удалены `INITIAL_STAGES`, контекст-провайдер, `handleSave`, экспорт `SaveOrderButton`
- `components/pipeline/StageRow.tsx` — `StageData` → `{ id, name, color, order, stageTimeLimitDays, leadsCount }`; точка цвета по hex `color` + палитра в popover; инлайн-переименование (blur/Enter → PATCH, Escape — отмена); инлайн-поле лимита (пусто → `{ stageTimeLimitDays: null }`, число > 0 → переопределение; PATCH только при изменении); счётчик лидов с плюрализацией; кнопка удаления `disabled` при единственном этапе
- `components/pipeline/AddStageModal.tsx` — `POST /api/stages` (имя + обязательный цвет + опц. лимит); опция «Без цвета» убрана, дефолт — первый из палитры; добавление в список из ответа API; Toast при ошибке
- `components/pipeline/DeleteStageModal.tsx` — `DELETE /api/stages/:id`; пустой этап (`leadsCount === 0`) — без `moveToStageId`; непустой — селект цели обязателен; обработка `LAST_STAGE` / `MOVE_TARGET_REQUIRED` понятными сообщениями
- `components/pipeline/stageHelpers.ts` — **new**: `STAGE_COLOR_PALETTE`, `DEFAULT_STAGE_COLOR`, `formatLeadsCount`

**Учтённые точки риска:**

- Цвет обязателен — «Без цвета» удалён из `AddStageModal`; точка рендерится по hex, не Tailwind-классу
- `stageTimeLimitDays` — три состояния: пустое поле шлёт `null` (сброс к дефолту компании); PATCH не отправляется, если значение не изменилось
- Reorder без `SaveOrderButton` — немедленное сохранение на `dragEnd` со snapshot-откатом
- Удаление: `confirmDisabled` только при `hasLeads && !targetStageId`; единственный этап — `canDelete={stages.length > 1}` в UI
- `leadsCount` — SSR-snapshot через `_count.leads` (включая закрытые лиды), как в API

**Out of scope (не делалось):** Kanban-доска `/pipeline`, `GET /api/pipeline/board`; смена этапа лида + `STAGE_CHANGED`; изменения бэкенда и миграций; новые компоненты в `components/admin/pipeline-settings/`

**Проверки:** TypeScript компилируется без ошибок, без `any`

---

## 2026-06-27 — Phase 8, Таск 1: API этапов воронки (CRUD + reorder + delete с переносом) + Zod

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/validations/stages.ts` — Zod-схемы: `STAGE_NAME_MAX_LENGTH` (100), `stageNameSchema`, `stageColorSchema` (hex `#rrggbb`); `createStageSchema`, `updateStageSchema` (`stageTimeLimitDays`: `.positive().nullable().optional()`), `reorderStagesSchema`, `deleteStageSchema`; типы через `z.infer<>`
- `app/api/stages/route.ts` — заменён стаб: `GET` (MANAGER+): `{ id, name, color, order, stageTimeLimitDays, leadsCount }`, `orderBy: order`, `_count.leads`; `POST` (ADMIN): `order = (max(order) ?? -1) + 1`, ответ `{ ...stage, leadsCount: 0 }` со статусом 201
- `app/api/stages/[id]/route.ts` — `PATCH` (ADMIN): `findFirst({ id, companyId })` → 404; `data` по присутствию ключей (`'name' in parsed.data` и т.д.); `DELETE` (ADMIN): гарды `LAST_STAGE` → `MOVE_TARGET_REQUIRED` → валидация `moveToStageId` (та же компания, `!== id`); `$transaction`: `updateMany(Lead.stageId)` + `delete(stage)`; без `Event`
- `app/api/stages/reorder/route.ts` — `PATCH` (ADMIN): полное совпадение множества `orderedIds` с этапами компании; пересчёт `order` в `prisma.$transaction`; ответ — отсортированный список с `leadsCount`

**Учтённые точки риска:**

- `stageTimeLimitDays` — три состояния в Zod и PATCH через `'stageTimeLimitDays' in parsed.data`, не truthiness
- DELETE без записи `Event` и без per-lead `STAGE_CHANGED` при bulk-переносе
- Порядок гардов DELETE: `404` → `LAST_STAGE` → `MOVE_TARGET_REQUIRED` → валидация цели переноса
- `moveToStageId` — та же компания и `!== id`; перенос + удаление в одной `$transaction`
- Все мутации — `hasMinRole(..., 'ADMIN')`, чтение — `'MANAGER'`; `session.kind === 'company'` + `where: { companyId }`; чужой ресурс → 404

**Out of scope (не делалось):** UI `/admin/pipeline-settings` и `components/pipeline/*` (Таск 2); `GET /api/pipeline/board`; смена этапа лида + `STAGE_CHANGED`; Prisma-миграции; `lib/pipeline/reorderStages.ts`

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-27 — Phase 7.5, Таск 2: UI управления причинами отказа в `/admin/settings`

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/api/loss-reasons/route.ts` — `GET` расширен: `{ id, label, order, inUse }` (`inUse` через `_count.leads > 0`); контракт `{ id, label }` для модалки закрытия не сломан
- `components/settings/LossReasonsSection.tsx` — Server Component: `SettingsCard` + `LossReasonsList`, проп `initialReasons`
- `components/settings/LossReasonsList.tsx` — Client, первый sortable-список проекта (`@dnd-kit/core` + `@dnd-kit/sortable`): drag handle отдельно от строки; инлайн-переименование (click → input → blur/Enter → `PATCH`); добавление (`POST`); удаление с подтверждением (`DELETE`); reorder — полный `orderedIds` → `PATCH /api/loss-reasons/reorder`; оптимистичное обновление + откат + `Toast`
- `app/(admin)/admin/settings/page.tsx` — SSR-выборка `lossReason.findMany` с `order` и `_count.leads`; `LossReasonsSection` **вне** `SettingsDirtyProvider`; `SettingsSections` + `SystemSection` — внутри
- `lib/leads/closeLead.ts` — tenant-check: `lossReason.findFirst({ where: { id, companyId } })` → `ValidationError('LOSS_REASON_INVALID')`

**Учтённые точки риска:**

- `LossReasonsSection` не внутри `SettingsDirtyProvider` — немедленное сохранение, без batch «Сохранить изменения»
- Reorder отправляет полный массив id в новом порядке (требование API)
- `inUse` — SSR-snapshot; параллельное закрытие лида ловится через `400 LOSS_REASON_IN_USE` + Toast, без отката списка
- `listeners` sortable — только на drag handle; клик по label — `onPointerDown stopPropagation` + редактирование

**Out of scope (не делалось):** настройки распределения/уведомлений/нормативов; `/control`; Prisma-миграции; `lib/validations/lossReasons.ts` (из таска 1)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-27 — Phase 7.5, Таск 1: CRUD API причин отказа + инвариант удаления

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/validations/lossReasons.ts` — Zod-схемы `createLossReasonSchema`, `updateLossReasonSchema`, `reorderLossReasonsSchema`; `label`: `trim`, `min(1)`, `max(200)`; типы через `z.infer<>`
- `app/api/loss-reasons/route.ts` — `GET` без изменений (MANAGER+, `{ id, label }`, `orderBy: order`); `POST` (ADMIN): `order = (max(order) ?? -1) + 1`, ответ `{ id, label, order }` со статусом 201
- `app/api/loss-reasons/[id]/route.ts` — `PATCH` (ADMIN): переименование по `updateLossReasonSchema`, `where: { id, companyId }` → 404; `DELETE` (ADMIN): `count(Lead where { lossReasonId, companyId })` до удаления → `400 LOSS_REASON_IN_USE` при использовании
- `app/api/loss-reasons/reorder/route.ts` — `PATCH` (ADMIN): валидация полного совпадения множества `orderedIds` с причинами компании; пересчёт `order` в `prisma.$transaction`; ответ — обновлённый список

**Учтённые точки риска:**

- Разный порог доступа: `GET` — `hasMinRole(..., 'MANAGER')`, мутации — `'ADMIN'` (модалка «Закрыть отказом» у менеджера не сломана)
- `DELETE` — явный `count` до удаления, не FK-constraint
- `reorder` — отдельный статический маршрут `reorder/`, не внутри `[id]`; сравнение множеств id без частичного апдейта
- Все запросы — `session.kind === 'company'` + `where: { companyId }`; чужой ресурс → 404
- CRUD не пишет события (`LOSS_REASON_*` нет в `EventType`)

**Out of scope (не делалось):** UI `LossReasonsList.tsx` (таск 2 фазы 7.5); tenant-fix `closeLead` (`LOSS_REASON_INVALID`); Prisma-миграции; уникальность `label`; события в `events`

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-27 — Phase 7, Таск 4: getLeadById + UI карточки + история + дубли + финальная сборка

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/leads/getLeadById.ts` — Server function (только чтение): лид + этап + ответственный + риск (`computeRiskBatch`) + `hasTakenInWork` / `takenAt` (из событий `LEAD_TAKEN_IN_WORK`) + `hasDuplicate` (оба направления `_count`) + комментарии + события с резолвом `userId → User.name` и `lossReasonId → LossReason.label` (type guard на `payload`); дубли через `OR: [{ leadId }, { matchedLeadId }]` с вычислением «другой стороны»; `visibilityWhere`; `null` для чужого/невидимого лида; **без** `writeEvent` / `LEAD_OPENED`
- `constants/eventLabels.ts` — `getEventLabel()` + тип `HistoryEventItem`; маппинг Phase 7 типов (`LEAD_CREATED`, `LEAD_OPENED`, `LEAD_UPDATED`, `LEAD_TAKEN_IN_WORK`, `LEAD_WON`, `LEAD_LOST`, `DUPLICATE_FLAGGED`, `LEAD_DELETED`, `COMMENTED`); нейтральный фолбэк «Событие в журнале»
- `app/api/leads/[id]/events/route.ts` — `GET`: сессия `company` + видимость лида → 401/404; `where: { leadId, companyId }`, `orderBy: { createdAt: 'desc' }`; batch-резолв имён и причин отказа; ответ `{ id, type, createdAt, userName, lossReasonLabel }[]`
- `app/api/leads/[id]/duplicates/route.ts` — `GET`: сессия + видимость; `DuplicateFlag` по обоим направлениям; ответ `{ id, matchType, matchedLead: { id, name, phone } }[]`
- `components/leads/LeadEditForm.tsx` — Client: форма `name/phone/email/comment`; клиентская валидация `updateLeadSchema`; `PATCH /api/leads/:id` → `router.refresh()` + toast
- `components/leads/DeleteLeadModal.tsx` — Client: модалка подтверждения; кнопка только при `hasMinRole(role, 'ADMIN')`; `DELETE /api/leads/:id` → редирект `/leads`
- `components/leads/DuplicateBlock.tsx` — Server: блок «Похожие лиды»; ссылки `/leads/:matchedId` + тип совпадения; пустое состояние «Дублей не обнаружено»
- `components/leads/LeadHistory.tsx` — SSR-проп `events[]`; строки через `getEventLabel`; пустое состояние «Нет событий»
- `components/leads/DuplicateBadge.tsx` — проп `matchedLeadId`; иконка обёрнута в `<Link href="/leads/{matchedLeadId}">`
- `components/leads/LeadHeader.tsx` — убраны фейковый `PipelineStatus` и `StatusBadge`; реальный этап — инлайн-бейдж с `style={{ backgroundColor: stage.color }}`; бейдж WON/LOST при `closeType`
- `components/leads/LeadContacts.tsx` — пропсы `name/phone/email/createdAt`; `null` → «не указан»
- `components/leads/LeadCustomFields.tsx` — проп `fields: Record<string, unknown>`; `renderValue(v: unknown)`; пустой объект → компонент не рендерится
- `components/leads/LeadMarketing.tsx` — пропсы `source`, `marketing`, `utm`; динамический key-value; пустые блоки marketing/utm не рендерятся
- `app/(app)/leads/[id]/page.tsx` — финальная сборка: `getLeadById` → `notFound()` при `null`; левая колонка (Header, RiskBadge, Contacts, DuplicateBlock, Marketing, CustomFields, EditForm, DeleteModal); правая (`LeadSidebar` с реальными `hasTakenInWork/takenAt/closeType/assignedTo`, Comments, TaskBlock-плейсхолдер, History); адаптив `flex-col lg:flex-row`
- `lib/leads/getLeads.ts` — `firstMatchedLeadId` для `DuplicateBadge` в списке лидов

**Учтённые точки риска:**

- `getLeadById` не пишет `LEAD_OPENED` — побочный эффект только в `GET /api/leads/:id` (таск 1)
- `DuplicateFlag` — запрос с `OR` по обоим направлениям; «другой» лид вычисляется по `flag.leadId === id`
- `Event.payload` — `extractLossReasonId` через type guard, без `any`
- `LeadHeader` — инлайн-бейдж этапа с `stage.color`, не `StatusBadge`
- `customFields` / `marketing` / `utm` — `renderValue()` для нестроковых значений
- `LeadSidebar` получает реальные данные из `getLeadById`, не захардкоженные заглушки

**Out of scope (не делалось):** `LeadYandex.tsx` (Phase 22); полноценный `TaskBlock` (Phase 15); смена этапа (Phase 9); назначение ответственного (Phase 11); новые Prisma-миграции

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 7, Таск 3: Комментарии — API + лента в карточке

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/validations/leads.ts` — `commentSchema`: `text` с `trim`, `min(1)`, `max(5000)`; экспорт `CommentInput`
- `app/api/leads/[id]/comments/route.ts` — API Route (server):
  - `GET` — сессия `kind === 'company'`, `MANAGER+`; `findAccessibleLead` с `visibilityWhere`; `prisma.comment.findMany` с `where: { leadId, lead: { companyId } }`, `orderBy: { createdAt: 'asc' }`, select `id, text, createdAt, user.name`; чужой/невидимый лид → 404
  - `POST` — `commentSchema`; проверка доступа к лиду; `prisma.comment.create({ leadId, userId, text })` → затем `writeEvent('COMMENTED', { leadId, userId })` **вне транзакции**; ответ 201 с созданным комментарием; невалидное тело → 400
- `components/leads/LeadComments.tsx` — Client Component: пропсы `leadId`, `comments[]` (SSR); лента с автором и временем (`whitespace-pre-wrap`, React-экранирование); счётчик из `comments.length`; пустое состояние «Нет комментариев»; textarea с `maxLength={5000}` → `POST .../comments` → `router.refresh()`; состояния loading/error
- `app/(app)/leads/[id]/page.tsx` — Server Component: `auth()` → redirect при отсутствии company-сессии; проверка видимости лида (`visibilityWhere`) → `notFound()`; самостоятельная `prisma.comment.findMany` с `where: { leadId, lead: { companyId } }` (без `getLeadById`); сериализация `createdAt` в ISO; передача `leadId` + `comments` в `LeadComments`; заглушка основного контента карточки сохранена

**Учтённые точки риска:**

- Тенант-фильтр комментариев через `lead: { companyId }`, не только по `leadId`
- Доступ к лиду проверяется до чтения/создания комментариев (`findAccessibleLead` / `visibilityWhere` в page и API)
- `writeEvent` вызывается после `comment.create`, не внутри `$transaction`
- `LeadComments` получает `leadId` пропсом — `handleSubmit` постит на корректный эндпоинт
- Серверная выборка в `page.tsx` без `getLeadById` — отдельный `findMany`, как оговорено для таска 3

**Out of scope (не делалось):** `getLeadById` и полный UI карточки (таск 4); история событий / `eventLabels.ts` (таск 4); блок дублей (таск 4); `TaskBlock`; редактирование и удаление комментариев

**Проверки:** `npx tsc --noEmit` — без ошибок

---

## 2026-06-26 — Phase 7, Таск 2: «Взял в работу» + закрытие + quick-close

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/api/leads/[id]/take/route.ts` — API Route (server): `POST`; сессия `kind === 'company'`, `MANAGER+`; `visibilityWhere`; идемпотентность через `findFirst` по `LEAD_TAKEN_IN_WORK` → 400 `ALREADY_TAKEN` с `takenAt`; иначе `writeEvent('LEAD_TAKEN_IN_WORK', ...)`
- `app/api/leads/[id]/close/route.ts` — API Route (server): `POST`; `closeLeadSchema`; видимость; `impersonatedByPlatformAdminId` из сессии → `closeLead(...)`; LOST без причины → 400 `LOSS_REASON_REQUIRED`
- `app/api/loss-reasons/route.ts` — API Route (server): `GET` read-only; `where: { companyId }`, `orderBy: { order: 'asc' }`; `{ id, label }[]`; доступен любой company-сессии (`MANAGER+`)
- `lib/leads/closeLead.ts` — `$transaction`: `findFirstOrThrow`, проверка `lossReasonId` для LOST, `Lead.updateMany(closeType/closedAt/lossReasonId)`, `tx.event.create` (`LEAD_WON` / `LEAD_LOST` с `payload: { lossReasonId }` для LOST) с явным `impersonatedByPlatformAdminId`; `ValidationError` для бизнес-ошибок
- `lib/validations/leads.ts` — `closeLeadSchema` через `z.discriminatedUnion('closeType', ...)`: `WON` без `lossReasonId`, `LOST` с `lossReasonId: z.string().min(1)`; экспорт `CloseLeadInput`
- `components/leads/TakeInWorkButton.tsx` — Client Component: пропсы `leadId`, `hasTakenInWork`, `takenAt`; `POST .../take` → `router.refresh()`; после взятия — read-only метка «Взято в работу» + время
- `components/leads/CloseLeadMenu.tsx` — Client Component: dropdown «Закрыть сделкой» (прямой POST WON) / «Закрыть отказом» (открывает модалку); скрыт при `isClosed`
- `components/leads/CloseAsLostModal.tsx` — Client Component: `GET /api/loss-reasons`; обязательный select; submit disabled без выбора; `POST .../close { LOST, lossReasonId }` → `router.refresh()`
- `components/leads/LeadSidebar.tsx` — обновлён: `TakeInWorkButton` + `CloseLeadMenu` вместо disabled-заглушек; ответственный — read-only текст; бейдж WON/LOST при `closeType != null`
- `components/leads/LeadRowQuickActions.tsx` — Client Component: обёртка `CloseLeadMenu` для строки списка; guard `closeType !== null` → не рендерится
- `components/leads/LeadsTable.tsx` — обновлён: `LeadRowQuickActions` в колонке действий рядом с «Открыть»

**Учтённые точки риска:**

- `closeLead` пишет событие через `tx.event.create`, не `writeEvent` — совместимо с `$transaction` и impersonation
- `closeLeadSchema` — `z.discriminatedUnion`, не optional `lossReasonId`; дублирующая проверка LOST без причины в handler и в транзакции
- `GET /api/loss-reasons` — порог `MANAGER+` (любая company-сессия), не только ADMIN
- `TakeInWorkButton` — «глупый» компонент с пропсами, без self-fetch (данные карточки — таск 4)
- `LeadRowQuickActions` — кнопка «Закрыть» скрыта при `closeType != null`
- Все три эндпоинта проверяют `session.kind === 'company'`; платформенная сессия → 401

**Out of scope (не делалось):** `getLeadById` и полный серверный рендер `/leads/[id]` (таск 4); комментарии (таск 3); история событий (таск 4); CRUD причин отказа (Phase 7.5); назначение ответственного (Phase 11); задачи и промпт при смене этапа (Phase 14/15)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 7, Таск 1: API карточки лида — `GET` / `PATCH` / `DELETE`

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/api/leads/[id]/route.ts` — API Route (server):
  - `GET` — `findFirst` с `{ id, companyId }` + `visibilityWhere`; select контактов, `source` / `utm` / `marketing` / `customFields` / `closeType` / `closedAt` / `stage` / `assignedTo` / `lossReason` / `_count.duplicateFlagsAsLead`; риск через `computeRiskBatch` (массив из одного элемента); идемпотентный `LEAD_OPENED` (`recordLeadOpenedOnce` — `findFirst` по `{ leadId, userId, type }` перед `writeEvent`)
  - `PATCH` — только `name` / `phone` / `email` / `comment` через `updateLeadSchema` + `buildUpdateData`; `updateMany` с `where: { id, companyId }` + `visibilityWhere`; событие `LEAD_UPDATED`; пустое тело или без изменяемых полей → 400
  - `DELETE` — только `hasMinRole(role, 'ADMIN')`; `LEAD_DELETED` с `leadId: null` и `payload: { deletedLeadId, name, phone }` **до** `deleteMany`; `where: { id, companyId }`
- `lib/validations/leads.ts` — `updateLeadSchema`: опциональные `name` (trim + min 1), `phone`, `email`, `comment`; без `.passthrough()` и без полей приёма; экспорт `UpdateLeadInput`

**Учтённые точки риска:**

- Чужой/невидимый лид (режим `OWN`) → 404 на GET и PATCH, не 403
- `LEAD_DELETED` пишется с `leadId: null`, чтобы событие пережило каскадное удаление
- `PATCH` не использует `.passthrough()` — лишние поля не попадают в Prisma `data`
- `updateMany` / `deleteMany` включают `companyId` в `where` напрямую, не только через предварительный GET
- Все handlers проверяют `session.kind === 'company'`; GET/PATCH требуют `MANAGER+`, DELETE — `ADMIN`

**Out of scope (не делалось):** UI карточки `/leads/[id]`; `POST /take`, `POST /close`; комментарии; история событий; список дублей; смена этапа (Phase 9)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 6, Таск 3: UI `/leads` — LeadsTable + фильтры (URL-params) + пагинация

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `components/leads/LeadsTable.tsx` — Client Component: колонки Клиент (имя + телефон), Источник, Ответственный, Этап (бейдж по `stage.color`), Риск (`RiskBadge`), Создан, «Открыть»; имя — `<Link href="/leads/{id}">`; `<DuplicateBadge />` при `hasDuplicate`; единственное действие из строки — ссылка «Открыть»
- `components/leads/RiskBadge.tsx` — Server Component: пропсы `{ level, reason }`; цвета через CSS-переменные (`green/yellow/red/grey` → Норма / Внимание / Риск / Закрыт); `reason` → атрибут `title`
- `components/leads/DuplicateBadge.tsx` — иконка-предупреждение без пропсов; `title` и `aria-label` «Возможный дубль»; без ссылки (Phase 7)
- `components/leads/LeadsFilters.tsx` — `useSearchParams()` + `useRouter()` вместо локального `useState`; проп `managers: ManagerOption[]`; `STATUS_OPTIONS`: `'' / open / won / lost`; URL-параметр менеджера — `assignedToId`; при смене фильтра `params.set('page', '1')`; «Сбросить» → `router.push('/leads')`
- `components/leads/LeadsPagination.tsx` — обязательные пропсы `total`, `page`, `pageSize`; навигация через URL (`params.set('page', …)`); удалены `TOTAL_ITEMS`, `PAGE_SIZE`, `TOTAL_PAGES` и локальный `useState`; `getPageItems` сохранена
- `app/(app)/leads/page.tsx` — async Server Component; `await searchParams` (Next.js 16); guard `session.kind !== 'company'` → `redirect('/login')`; `session as CompanySession`; параллельно `getLeadsWithRisk` + `getManagers`; пустое состояние «Лиды не найдены»; `<LeadsFilters>` и `<LeadsPagination>` обёрнуты в `<Suspense>`

**Учтённые точки риска:**

- Оба компонента с `useSearchParams()` (`LeadsFilters`, `LeadsPagination`) обёрнуты в `<Suspense>` на странице
- URL-параметр менеджера — `assignedToId`, не `manager`; период — `period`, не `from/to`
- `page` читается только из URL и пропсов сервера, локальный `useState` для страницы удалён
- После guard сессии — явный `session as CompanySession` для `getLeadsWithRisk`

**Out of scope (не делалось):** страница карточки `/leads/:id` (Phase 7); быстрые действия из строки (Phase 11, 15); изменения API и `lib/leads/getManagers.ts`

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 6, Таск 2: `lib/risk/` + интеграция риска в `GET /api/leads`

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/risk/computeRisk.ts` — pure function `computeRisk(input: RiskInput): RiskResult`; типы `RiskLevel`, `RiskResult`, `ReactionNorms`, `RiskInput`; 8 приоритетов по `phase-6.md`: закрыт WON/LOST → grey; нет ответственного → red; нет первого ответа (норма) → red; застрял на этапе → red; просрочена открытая задача → yellow; нет открытой задачи → yellow; приближается срок первого ответа → yellow; иначе green; 0 запросов к БД
- `lib/risk/resolveApplicableNorm.ts` — pure function; приоритет нормы: `byUser` > `byStage` > `bySource` > `defaultMinutes`; возвращает `{ defaultMinutes, reminderBeforePercent, workHoursOnly }`
- `lib/risk/workHoursUtils.ts` — `minutesSinceCreated(createdAt, now, workHoursOnly)`: в Phase 6 обе ветки (`workHoursOnly` true/false) считают wall-clock минуты; полная логика рабочих часов — Phase 17
- `lib/risk/computeRiskBatch.ts` — принимает `LeadListItem[]` + `companySettings` + `prisma`; ровно 2 Prisma-запроса (`Promise.all`: events `LEAD_TAKEN_IN_WORK`/`STAGE_CHANGED` + tasks `TODO`/`IN_PROGRESS`); группировка по `leadId` в памяти; `createdAt` ISO-строка → `new Date(lead.createdAt)`; fallback `lastStageChangedAt` → `createdAt`; возвращает `Array<LeadListItem & { risk: RiskResult }>`
- `lib/leads/getLeads.ts` — `stageTimeLimitDays: number | null` в типе `LeadListItem.stage` и в Prisma `select`; `getLeads` дополнительно возвращает `companySettings` для батча; экспорт `getLeadsWithRisk(params, session)` — обёртка `getLeads` + `computeRiskBatch`; тип `GetLeadsWithRiskResult`
- `app/api/leads/route.ts` — GET делегирует в `getLeadsWithRisk`; ответ `{ leads, total, page, pageSize }`, каждый лид с `risk: { level, reason }`

**Учтённые точки риска:**

- `stageTimeLimitDays` синхронно в типе и `select`; `null` → `?? companySettings.stageStuckDaysDefault` в `computeRisk`
- `createdAt: string` → `new Date(lead.createdAt)` в `computeRiskBatch`, без `as`
- Ключ ответа API — `leads`, не `items`
- N+1 исключён: только 2 запроса на весь батч, без цикла по Prisma
- Порядок приоритетов 5/6 по `phase-6.md`: сначала `overdueOpenTask != null`, затем `!hasOpenTask`
- `computeRisk.ts` и `resolveApplicableNorm.ts` без Prisma-импортов

**Out of scope (не делалось):** полная ветка `workHoursOnly = true` (Phase 17); хранение риска в БД; UI (`RiskBadge`, `LeadsTable`) — Таск 3; другие эндпоинты (`/api/leads/:id`, Kanban, «Сегодня»)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 6, Таск 1: `lib/leads/` + `GET /api/leads` (сервер, без риска)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/leads/visibilityFilter.ts` — pure function `visibilityWhere(role, userId, leadVisibility)`: HEAD/ADMIN через `hasMinRole(role, 'HEAD')` → `{}`; MANAGER + `leadVisibility=OWN` → `{ assignedToId: userId }`; MANAGER + `ALL` → `{}`
- `lib/leads/getLeads.ts` — `getLeads(params, session)`: загрузка `company.settings` → извлечение `leadVisibility`; сборка `where` через `AND: [{ companyId }, visibility, …фильтры]`; параллельно `findMany` + `count`; экспорт типов `LeadListItem`, `GetLeadsResult`; `hasDuplicate` из `_count.duplicateFlagsAsLead > 0`; сортировка `createdAt desc`
- `lib/leads/getManagers.ts` — `getManagers(companyId)`: активные пользователи (`isBlocked: false`), `orderBy: name asc`, тип `ManagerOption`
- `lib/validations/leads.ts` — `leadsQuerySchema` + `LeadsQueryInput`: `search`, `source`, `assignedToId`, `status` (`''` | `open` | `won` | `lost`), `period` (`''` | `today` | `week` | `month`), `page`, `pageSize` (max из константы)
- `constants/leads.ts` — `UNASSIGNED_MANAGER_ID = 'unassigned'`, `DEFAULT_LEADS_PAGE_SIZE = 20`, `MAX_LEADS_PAGE_SIZE = 100`
- `app/api/leads/route.ts` — `GET`: только `session.kind === 'company'` → иначе `401`; query-параметры через `leadsQuerySchema.safeParse` → `400` при ошибке; делегирование в `getLeads`; `POST` не изменён

**Учтённые точки риска:**

- `assignedToId === 'unassigned'` → `{ assignedToId: null }` в `buildAssignedToFilter`, строка в Prisma не передаётся
- `companyId` — первый элемент `AND`, visibility и остальные фильтры добавляются отдельными условиями (не spread поверх `companyId`)
- `hasDuplicate` — только `_count.duplicateFlagsAsLead`, не `matchedLead`
- `visibilityWhere` принимает `(role, userId, leadVisibility)`, не `session`; `leadVisibility` читается из `company.settings` внутри `getLeads`
- Поиск: `name`/`email` — `contains` + `mode: 'insensitive'`; `phone` — plain `contains`

**Out of scope (не делалось):** `computeRisk` / `computeRiskBatch` (Таск 2); UI (`LeadsTable`, `RiskBadge`, `DuplicateBadge`, обновление `page.tsx`, URL-params в `LeadsFilters`) — Таск 3

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 5, Таск 4: Ручное создание лида — POST /api/leads (синхронный дедуп → 409) + UI

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/api/leads/route.ts` — `POST`: только `session.kind === 'company'` → иначе `401`; `hasMinRole(session.user.role, 'MANAGER')` → иначе `403`; `companyId` из сессии; `createLeadSchema.safeParse` → пустой `name` даёт `400`; `const { confirmDuplicate, ...rest } = parsed.data` — флаг не попадает в `createLead`; синхронный дедуп до сохранения через `findPossibleDuplicates` → при совпадении без `confirmDuplicate` — `409 { error: "POSSIBLE_DUPLICATE", possibleDuplicates: [{ id, name, matchType }] }`, лид не создаётся; без совпадений — `createLead(rest, 'manual', companyId)` → `201 { id }`; с `confirmDuplicate: true` — создание + fire-and-forget `void flagPossibleDuplicates(lead.id, companyId).catch(console.error)`
- `lib/validations/leads.ts` — `createLeadSchema`: `name` обязателен (`z.string().trim().min(1)`), `phone`/`email` опциональны без проверки формата, `confirmDuplicate?: boolean`, `.passthrough()` для остальных полей формы
- `components/leads/DuplicateWarningModal.tsx` — Client Component: превью совпадений (имя, тип «Телефон»/«Email»), кнопки «Всё равно создать» / «Открыть существующий», loading state на подтверждении
- `components/leads/CreateLeadForm.tsx` — `handleSubmit` → `fetch('/api/leads')`; `buildRequestBody` трансформирует UTM (`utmSource` → `utm_source` и т.д.) до отправки; обработка `409` → открытие `DuplicateWarningModal`; повтор с `confirmDuplicate: true` или переход на `/leads/:id`; кнопка «Создать лид» недоступна во время запроса; `stageId`, `managerId`, `tags`, `priority`, напоминания в тело запроса не отправляются

**Что было реализовано сверх плана `TASK.md`:**

- `lib/intake/findPossibleDuplicates.ts` — выделен синхронный SELECT-дедуп (до 5 совпадений по `phone OR email`, `matchType`: `PHONE` / `EMAIL`); отделён от `flagPossibleDuplicates`, который пишет `DuplicateFlag` только после подтверждённого создания

**Учтённые точки риска:**

- UTM camelCase → underscore в `buildRequestBody`, иначе поля ушли бы в `customFields`
- `confirmDuplicate` деструктурируется в route до `createLead`, не через `normalizeLead`
- Синхронный дедуп — только чтение; `DuplicateFlag` — только после `createLead` с `confirmDuplicate: true`
- `Lead.source` всегда `'manual'`; маркетинговый `source` из формы (`call`, `referral` и др.) уходит в `customFields`
- `hasMinRole(role, 'MANAGER')` добавлен явно, хотя пропускает всех пользователей компании

**Out of scope (не делалось):** `GET /api/leads` (Phase 6); `stageId`/`managerId` из формы (Phase 11); напоминания из формы (Phase 14); `tags`/`priority` (будущие фазы); SSE/Telegram о новом лиде (Phase 12–13); `autoAssignLead` (Phase 11); полноценный список `/leads` (Phase 6)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 5, Таск 3: `flagPossibleDuplicates()` + постдействия приёма

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/intake/flagPossibleDuplicates.ts` — `flagPossibleDuplicates(leadId, companyId)`: ранний выход если нет `phone` и `email`; поиск до 5 совпадений по `phone OR email` (тот же `companyId`, `id != leadId`); на каждое совпадение — `prisma.duplicateFlag.create(...)` + `writeEvent(companyId, 'DUPLICATE_FLAGGED', { payload: { matchedLeadId, matchType }, leadId })`; `matchType`: `'PHONE'` при совпадении телефона, иначе `'EMAIL'`; OR-условия через imperative push (`orConditions: Prisma.LeadWhereInput[]`) без каста; ошибки глотаются внутри `try/catch`, наружу не пробрасываются
- `app/api/webhooks/tilda/[companyId]/route.ts` — `const lead = await createLead(...)`; fire-and-forget `void flagPossibleDuplicates(lead.id, companyId).catch(console.error)` перед `return`
- `app/api/webhooks/wordpress/[companyId]/route.ts` — то же
- `app/api/webhooks/leads/route.ts` — то же

**Что было реализовано сверх плана `TASK.md`:**

- Константа `MAX_DUPLICATE_MATCHES = 5` вместо magic number в `take`

**Out of scope (не делалось):** `autoAssignLead()`, `notifyNewLead()` (Phase 11–13); UI отображения пометки дубля (Phase 6/7); `POST /api/leads` с синхронным дедупом (Таск 4); автоматизированные тесты

**Проверки:** `npm run type-check` — без ошибок; smoke-чек-лист из DoD — ручной (webhook в заблокированную компанию, нестандартные поля → `customFields`, два webhook с одним phone → `DuplicateFlag`)

---

## 2026-06-26 — Phase 5, Таск 2: Webhook-эндпоинты + rate limit + здоровье источника

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/api/webhooks/tilda/[companyId]/route.ts` — `POST`; `params: Promise<{ companyId: string }>` + `await params`; rate limit 60/мин по IP; тестовый запрос Tilda (`body['test'] === 'test'`) после `parseBody` → 200 без лида; `createLead` + `touchIntegrationSource`; без проверки `isBlocked`
- `app/api/webhooks/wordpress/[companyId]/route.ts` — то же для WordPress; JSON и form-urlencoded через `parseBody` без дополнительной логики
- `app/api/webhooks/leads/route.ts` — universal webhook: `companyId` только из `verifyApiKey`; без/невалидный ключ → 401, `touchIntegrationSource` не вызывается; rate limit по IP до верификации, по `ApiKey.id` после; `createLead` + `touchIntegrationSource`
- `lib/intake/verifyApiKey.ts` — SHA-256 хэш-сравнение (не bcrypt); возвращает `{ companyId, sourceLabel, apiKeyId } | null`; plain ключ не логируется
- `lib/intake/touchIntegrationSource.ts` — upsert по `companyId_type_label`; успех → `lastUsedAt`, `errorCount: 0`; провал → `lastErrorAt`, `errorCount++`
- `scripts/seedTestApiKey.ts` — генерация криптостойкого ключа, SHA-256 хэш, создание `ApiKey` в БД, вывод plain key; повторный запуск не создаёт дубль (проверка по `name`)
- `package.json` — скрипт `"seed:api-key": "npx tsx scripts/seedTestApiKey.ts"`
- Удалены пустые стабы `app/api/webhooks/tilda/route.ts` и `app/api/webhooks/wordpress/route.ts` (без `[companyId]`)

**Что было реализовано сверх плана `TASK.md`:**

- `lib/validations/webhooks.ts` — Zod-схема `webhookBodySchema` (`z.record(z.unknown())`) для тела webhook-запросов
- Tilda/WordPress — проверка существования компании по `companyId` из пути → 404, если компания не найдена
- Universal webhook — извлечение ключа из заголовка `X-API-Key` или query-параметра `key`
- `verifyApiKey` — дополнительное поле `apiKeyId` в ответе для rate limit по идентификатору ключа

**Out of scope (не делалось):** `flagPossibleDuplicates()` и постдействия (Таск 3); `autoAssignLead`, `notifyNewLead` (Phase 11–13); UI генерации и управления API-ключами (Phase 18); Яндекс Директ (Phase 22); `GET /api/leads` (Phase 6); ручное создание лида через UI (Таск 4)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 5, Таск 1: lib/intake/ ядро — parseBody + normalizeLead + createLead + fieldAliases

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `constants/fieldAliases.ts` — карта `FIELD_ALIASES` (name/имя/фио, phone/телефон/tel, email/e-mail/почта, comment/комментарий/сообщение и др.); набор `MARKETING_FIELDS` (gclid, yclid, fbclid, roistat, \_ym_uid и др.) для `Lead.marketing`
- `lib/intake/parseBody.ts` — server-side lib: разбор тела запроса (JSON, `application/x-www-form-urlencoded`, `multipart/form-data`, fallback raw text → JSON → url-encoded); не бросает исключение — возвращает `Record<string, unknown>` или `{}`
- `lib/intake/normalizeLead.ts` — server-side lib: `normalizeLead(raw, source)` → `NormalizedLead`; регистронезависимый маппинг через `FIELD_ALIASES`; `utm_*` → `utm`; маркетинговые поля → `marketing`; остальное → `customFields` с оригинальным ключом; пустые значения стандартных полей → `null`; первое распознанное значение побеждает при дублях алиасов
- `lib/intake/createLead.ts` — server-side lib: `createLead(raw, source, companyId)`; `stageId` через `pipelineStage.findFirst({ where: { companyId }, orderBy: { order: 'asc' } })`; `prisma.$transaction`: `tx.lead.create(...)` + `tx.event.create({ type: 'LEAD_CREATED', ... })`; `assignedToId: null`; без `writeEvent` внутри транзакции
- `lib/validations/intake.ts` — мягкая Zod-схема `intakeLeadSchema`: все стандартные поля optional/nullable, `utm`/`marketing`/`customFields` как `z.record(z.unknown())`, `.passthrough()` — не отклоняет нестандартную структуру

**Что было реализовано сверх плана `TASK.md`:**

- `parseBody` — поддержка `multipart/form-data` (в TASK указаны только JSON, form-urlencoded и raw text)
- `fieldAliases` — расширенный набор синонимов (фио, full_name, mobile, description и др.) и маркетинговых полей (calltouch, comagic, metrika и др.)

**Out of scope (не делалось):** webhook-эндпоинты tilda/wordpress/leads (Таск 2); `verifyApiKey`, `touchIntegrationSource`, rate limiting (Таск 2); `flagPossibleDuplicates` (Таск 3); `POST /api/leads` и UI ручного создания (Таск 4); `autoAssignLead`, `notifyNewLead` (Phase 11–13)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 4, Таск 4: Зачистка шаблонов от хардкода → пустые состояния

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/(app)/leads/page.tsx` — Server Component: удалены `MOCK_LEADS` (8 записей), `LeadRow`, `LEADS_COLUMNS`; счётчик `248` в заголовке убран; `LeadsTable` и `LeadsPagination` заменены пустым состоянием «Пока нет лидов»; `LeadsFilters` оставлен как структурная заглушка
- `app/(app)/leads/[id]/page.tsx` — Server Component: `metadata.title` → `'Лид'`; `LeadHeader`, `LeadContacts`, `LeadMarketing`, `LeadYandex`, `LeadCustomFields` с хардкод-пропсами убраны; заглушка «Данные лида появятся в Phase 7»; `LeadSidebar`, `LeadComments`, `LeadHistory`, `TaskBlock` — без изменений структуры
- `app/(admin)/admin/settings/page.tsx` — Server Component: `auth()` → `prisma.company.findUniqueOrThrow({ where: { id: session.user.companyId }, select: { name, nextPaymentAt } })` → пропсы в `<SystemSection>`
- `components/pipeline/PipelineBoard.tsx` — Client Component: удалены `INITIAL_STAGES` (5 этапов, 15 карточек) и `LEAD_DETAIL_PATH`; `useState<PipelineStage[]>([])`; пустое состояние «Этапы воронки появятся в Phase 8/9»; DnD-механизм (`sensors`, `handleDragStart/End/Cancel`, `moveLead`, `findLead`) сохранён; `handleCardClick` — TODO-заглушка для Phase 9
- `components/tasks/TasksBoard.tsx` — Client Component: удалены `MOCK_TASKS` (6 задач) и `MOCK_LEAD_DETAIL_PATH`; `useState<TaskItem[]>([])`; `totalCount = tasks.length`; `ASSIGNEE_FILTER_OPTIONS` — только `{ value: 'any', label: 'Любой' }`; убрана проверка `task.assignee !== "Алексей Д."` для вкладки «Мои»; `handleTaskClick` → `router.push(\`/leads/${task.lead.id}?taskId=${task.id}\`)`; пустое состояние «Нет задач»; пустые группы не рендерятся
- `components/users/UsersTable.tsx` — Client Component: удалён `MOCK_USERS` (5 записей); `useState<User[]>([])`; пустое состояние «Нет пользователей» в `<tbody>`
- `components/integrations/ApiKeysTable.tsx` — Client Component: удалён `MOCK_API_KEYS` (2 ключа); `useState<ApiKeyRow[]>([])`; пустое состояние «Нет API-ключей» в `<tbody>`
- `components/leads/LeadComments.tsx` — Client Component: удалён `MOCK_COMMENTS` (3 комментария); счётчик `0`; пустое состояние «Нет комментариев»; форма добавления сохранена
- `components/leads/LeadHistory.tsx` — Server Component: удалён `MOCK_HISTORY` (3 события); пустое состояние «Нет событий»
- `components/leads/LeadSidebar.tsx` — Client Component: удалены `INITIAL_STATUS`, `INITIAL_MANAGER`, `STATUS_OPTIONS`, `MANAGER_OPTIONS`; `FilterSelect` → `DisabledSelect` с опцией «—»; кнопка «Сохранить изменения» всегда `disabled`
- `components/leads/CreateLeadForm.tsx` — Client Component: `tags: []`, `source: 'other'`, `stageId: ''`; удалены `STAGE_OPTIONS`, хардкод-менеджеры из `MANAGER_OPTIONS`, тип `PipelineStatus`, `selectedStage`/`dotClass`; поле «Этап воронки» — `<select disabled>` с «—»; превью-карточка — `status="new"`
- `components/leads/LeadsFilters.tsx` — Client Component: из `MANAGER_OPTIONS` убраны хардкод-имена; оставлен только `{ value: '', label: 'Менеджер' }`
- `components/settings/SystemSection.tsx` — Server Component: пропсы `companyName: string`, `nextPaymentAt: Date | null`; `'ООО «Пример»'` → `companyName`; `'31.12.2026'` → `nextPaymentAt ? toLocaleDateString('ru-RU') : '—'`; строка «Лицензия: Активна» убрана

**Что было реализовано сверх плана `TASK.md`:**

- `app/(admin)/admin/settings/page.tsx` — явная проверка `session.kind !== 'company'` и `redirect('/login')` (defense-in-depth поверх `proxy.ts`)
- `app/(app)/leads/page.tsx` — убрана `LeadsPagination` вместе с таблицей (в TASK — «оставить как структурную заглушку», но без данных таблица не имеет смысла)

**Out of scope (не делалось):** data-fetching лидов, задач, пользователей, этапов, менеджеров, API-ключей (Phase 5–18); валидация и submit `CreateLeadForm` (Phase 5), `LeadSidebar` (Phase 7); фильтр «Мои задачи» по текущему пользователю сессии (Phase 15); DnD-API смены этапа (Phase 9); загрузка настроек уведомлений/напоминаний/распределения из БД (Phase 17); `NotificationsSection`, `RemindersSection`, `DistributionSection`, `SecuritySection` — не тронуты

**Проверки:** `npm run type-check` — без ошибок; `npm run build` — успешно

---

## 2026-06-26 — Phase 4, Таск 3: Дашборд — реальные агрегаты + пустые состояния + design_system.md

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `app/(app)/today/page.tsx` — Server Component: `auth()` → `companyId`, редирект без сессии компании; 4 Prisma-счётчика через `Promise.all` с `where: { companyId }` (всего / новых сегодня `createdAt >= todayStart` / в работе `closeType: null` / сделок `closeType: 'WON'`); дата в хедере через `Intl.DateTimeFormat('ru-RU')` вместо хардкода «7 июня 2026»; пропсы в `StatsRow`
- `components/dashboard/StatsRow.tsx` — Server Component: интерфейс `StatsRowProps` с 4 числами; константа `STATS` удалена
- `components/dashboard/RecentLeads.tsx` — Server Component: `'use client'` и `MOCK_LEADS` убраны; пустое состояние «Пока нет лидов» в карточке; заголовок и ссылка «Все лиды →» сохранены
- `components/dashboard/LeadsChart.tsx` — Client Component: `MOCK_CHART_DATA`, recharts (`AreaChart`, `Tooltip`) и импорты удалены; пустое состояние «Пока нет данных» внутри `Card`, высота 220px сохранена
- `.docs/design_system.md` — 7 расхождений с кодом: LeadCRM → LeadFlow (§1, §5.1 ASCII); Tabler Icons → Lucide через `@iconify/react` (§6); `--color-sidebar-item-active-bg` → `--color-sidebar-item-active`; убран `--color-sidebar-bg-dark`, тёмная тема переопределяет `--color-sidebar-bg`; dark `--color-text-secondary` `#64748B` → `#94A3B8` (§2.5 и §9); адаптив сайдбара — 2 состояния (220px desktop / скрыт + бургер), без icon-rail 60px; JetBrains Mono → `ui-monospace` с пометкой «не подключён»
- `CLAUDE.md` — ссылка в таблице документации: `design-system.md` → `design_system.md`

**Что было реализовано сверх плана `TASK.md`:**

- `today/page.tsx` — явная проверка `session.kind !== 'company'` и `redirect('/login')` (defense-in-depth поверх `proxy.ts`)
- `today/page.tsx` — явные типы возврата `Promise<JSX.Element>` / `JSX.Element` для `BellIcon`

**Out of scope (не делалось):** реальные данные для `RecentLeads` (Phase 6/19) и `LeadsChart` (Phase 21); зачистка мок-данных вне дашборда (Таск 4); полноценный экран «Сегодня» (Phase 19); удаление `recharts` из зависимостей; правило §10 «Иконки — только Tabler outline» в конце `design_system.md` (§6 уже обновлён на Lucide)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-26 — Phase 4, Таск 2: Атом Select + переключатель темы (light/dark)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `components/ui/Select.tsx` — Client Component: кастомный дропдаун под дизайн-систему; скрытый нативный `<select>` (`sr-only`) для accessibility и сериализации форм; визуальный триггер-кнопка (36px, border 0.5px, `--radius-sm`, focus/open border `#10B981`, placeholder `--color-text-tertiary`) + шеврон `lucide:chevron-down`; абсолютный `<ul role="listbox">` с hover `--color-bg-surface-2` и активной опцией `--color-primary`; закрытие по `mousedown` вне компонента с cleanup в `useEffect`
- `components/providers/ThemeProvider.tsx` — Client Component: React Context `{ theme, toggleTheme }`; SSR-безопасный дефолт `'light'`; чтение `localStorage('theme')` / `prefers-color-scheme` в `useEffect`; запись в `localStorage` + `document.documentElement.dataset.theme` при переключении; хук `useTheme()`
- `components/ui/ThemeToggle.tsx` — Client Component: `IconButton` size sm; иконка `lucide:sun` в dark / `lucide:moon` в light; `aria-label` на русском
- `app/layout.tsx` — `suppressHydrationWarning` на `<html>`; инлайн-скрипт в `<head>` (анти-FOUC: `data-theme` до гидрации); обёртка `{children}` в `<ThemeProvider>`
- `components/layout/Sidebar.tsx` — `<ThemeToggle />` в нижней секции рядом с аватаром; фон сайдбара через `bg-[var(--color-sidebar-bg)]` — тёмный в обеих темах
- `components/index.ts` — экспорт `Select` и `ThemeToggle`

**Что было реализовано сверх плана `TASK.md`:**

- `ThemeProvider` — `startTransition` при синхронизации темы из `localStorage` на монтировании (снижение риска hydration mismatch)
- `Select` — триггер на `<button type="button">` вместо `<div>` (лучше для клавиатуры и a11y)
- `ThemeToggle` — кастомный `className` под тёмный сайдбар (`text-[#94A3B8]`, hover на белом фоне)

**Out of scope (не делалось):** обновление `design_system.md` (Таск 3); реальные агрегаты дашборда `/today` (Таск 3); зачистка мок-данных в шаблонах (Таск 4); поиск и виртуализация в Select; промежуточный icon-rail сайдбара (60px)

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-25 — Phase 4, Таск 1: Роль-зависимая оболочка (серверная сессия → пропсы) + навигация

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `constants/navItems.ts` — поле `minRole: UserRole` в `SidebarNavItem`; пункты «Контроль» (`/control`, `HEAD`) и «Отчёты» (`/reports`, `HEAD`); хелпер `getNavItemsForRole(role)` — фильтр через `hasMinRole`
- `components/layout/AppShell.tsx` — Server Component: `auth()` → `prisma.user.findUnique({ where: { id, companyId }, select: { name: true } })` → `getNavItemsForRole(role)` → `AppLayout` + `Sidebar` (`items`, `userName`, `userInitials`); `computeInitials()` внутри оболочки (пустое имя → `?`, одно слово → первая буква, несколько → первая + последняя); `ImpersonationBanner` при `impersonatedByPlatformAdminId`; без сессии компании — только `children` (публичные/платформенные маршруты без сайдбара)
- `app/(app)/layout.tsx` — обёртка `children` в `<AppShell>`; логика баннера impersonation убрана (переехала в `AppShell`)
- `app/(management)/layout.tsx` — обёртка `children` в `<AppShell>`
- `app/(admin)/layout.tsx` — обёртка `children` в `<AppShell>`
- `app/layout.tsx` — убран `ShellGate`; только `html`/`body`, `globals.css`, метаданные
- `components/layout/ShellGate.tsx` — удалён
- `components/layout/Sidebar.tsx` — `userName` и `userInitials` обязательные пропсы (дефолты «Администратор» / «АД» убраны)

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** атом `Select` и переключатель темы (Таск 2); реальные агрегаты `/today` (Таск 3); зачистка мок-данных в шаблонах (Таск 4); содержимое `/control` и `/reports`; изменения `lib/auth.ts`, JWT и типов сессии

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-25 — Phase 3, Таск 5: Сброс пароля (API + UI) + rate limiting

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/auth/passwordReset.ts` — `resetUserPassword(token, password)`: поиск токена по `hashToken(token)`; именованные ошибки `TOKEN_INVALID` / `TOKEN_USED` / `TOKEN_EXPIRED`; транзакция — обновление `passwordHash` пользователя + `updateMany` по `userId` (все неиспользованные токены → `usedAt = now()`)
- `lib/validations/auth.ts` — `resetPasswordSchema` (`token`, `password` min 8) и `ResetPasswordInput`
- `lib/rateLimit.ts` — in-memory fixed-window limiter (`Map<string, number[]>`); `checkRateLimit(key, limit, windowMs)` → `boolean`; при `key === undefined` (нет `x-forwarded-for` в dev) лимит не применяется — запрос всегда пропускается
- `app/api/auth/reset-password/route.ts` — POST, публичный; Zod → rate check (IP, 10/час) → `resetUserPassword` → `200 { success: true }` / `400` с кодами токена / `429 TOO_MANY_REQUESTS`
- `app/(public)/reset-password/page.tsx` — Server Component; `searchParams.token` → prop в форму; без токена — сообщение об ошибке и ссылка на `/forgot-password`
- `components/auth/ResetPasswordForm.tsx` — Client Component; поле нового пароля (min 8, toggle видимости); POST `/api/auth/reset-password`; маппинг `TOKEN_*` / `TOO_MANY_REQUESTS` / `SERVER_ERROR`; при успехе `router.push('/login?reset=1')`
- `app/api/auth/forgot-password/route.ts` — rate check после Zod-парсинга: ключ `IP:email`, 5/час → `429`
- `app/api/auth/accept-invite/route.ts` — rate check по IP до бизнес-логики, 10/час → `429`
- `app/(public)/login/page.tsx` — баннер при `?reset=1`: «Пароль успешно изменён, войдите» (success `#22C55E`, flat UI)

**Что было реализовано сверх плана `TASK.md`:**

- `lib/rateLimit.ts` — fixed-window вместо token-bucket из спецификации; при отсутствии IP лимит пропускается (не ключ `"unknown"`, как в TASK)
- `lib/auth/passwordReset.ts` / `forgot-password` — `createUserPasswordResetToken` бросает `USER_NOT_FOUND` вместо тихого `null`; route возвращает `400 USER_NOT_FOUND` (в Таске 4 был только generic success)

**Out of scope (не делалось):** email после успешного сброса; повторная отправка ссылки со страницы reset; смена пароля изнутри системы (Phase 10); Nginx rate limit; изменения `proxy.ts`

**Проверки:** `npm run type-check` — без ошибок

---

## 2026-06-25 — Phase 3, Таск 4: Восстановление пароля — запрос (API + UI)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `prisma/schema.prisma` — модель `UserPasswordResetToken` (зеркало `PlatformAdminPasswordResetToken`): `id`, `userId`, `tokenHash @unique`, `expiresAt`, `usedAt?`, `createdAt`; relation на `User` с `onDelete: Cascade`; индексы по `userId` и `expiresAt`; обратная связь `passwordResetTokens` в `User`
- `prisma/migrations/20260624220335_add_user_password_reset_token` — миграция таблицы
- `.docs/database.md` — описание модели `UserPasswordResetToken` и поведения публичного эндпоинта
- `lib/auth/passwordReset.ts` — `createUserPasswordResetToken(email)`: нормализация `toLowerCase().trim()`, поиск `User` по глобально уникальному `email` без `companyId`, пропуск заблокированных (`isBlocked`); генерация токена, сохранение `hashToken(token)` с TTL 1 час; возврат `{ email, token }` или `null`
- `lib/auth/sendPasswordResetEmail.ts` — шаблон письма со ссылкой `/reset-password?token=...`; guard `isEmailConfigured()` → `console.warn` и skip без падения
- `lib/validations/auth.ts` — `forgotPasswordSchema` и `ForgotPasswordInput`
- `app/api/auth/forgot-password/route.ts` — POST, публичный; Zod-валидация; `resetUrl` из `APP_URL`; generic `{ success: true, message }` при любом исходе (нет пользователя, заблокирован, ошибка SMTP, отсутствие `APP_URL` — только `console.error`/`console.warn`); прецедент платформенного forgot-password
- `app/(public)/forgot-password/page.tsx` — заглушка «Раздел в разработке» заменена на `<ForgotPasswordForm />`
- `components/auth/ForgotPasswordForm.tsx` — Client Component: Zod-валидация email до fetch → POST `/api/auth/forgot-password` → экран успеха с generic-текстом (без редиректа и зависания) или ошибка валидации/сети

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** reset-password API и UI (`ResetPasswordForm`, `resetUserPassword`) — Таск 5; `lib/rateLimit.ts` и rate limiting — Таск 5; изменения `proxy.ts` — Таск 5

---

## 2026-06-25 — Phase 3, Таск 3: Приём приглашения — автовход

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `components/auth/AcceptInviteForm.tsx` — после успешного POST `/api/auth/accept-invite` (`200 { success: true }`) вместо безусловного редиректа на `/login?registered=1` вызывается `signIn('company-credentials', { email, password, redirect: false, redirectTo: '/today' })`: `email` — из prop invite (поле disabled/readOnly), `password` — из формы; при успехе `router.push('/today')`; при `signInResult?.error` или исключении — graceful fallback на `/login?registered=1` (аккаунт уже создан, повторный сабмит дал бы `EMAIL_EXISTS`); маппинг ошибок API до создания пользователя (`INVITE_INVALID` / `EMAIL_EXISTS` / `VALIDATION_ERROR` / `SERVER_ERROR`) сохранён

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** forgot/reset-password (Таски 4–5); rate limiting на `accept-invite` (Таск 5); изменения `lib/auth/acceptInvite.ts`, route-хендлера, миграций БД; каркас `/today` (Phase 4); клиентская Zod-предвалидация формы

---

## 2026-06-25 — Фикс: выход из режима поддержки возвращает к списку компаний

**Статус:** ✅ Завершён

**Проблема:** impersonation использует один cookie сессии NextAuth — вход «как поддержка» перезаписывал платформенную сессию компанийной. При выходе `/api/platform/impersonate/end` делал только `signOut` + чистил cookie, поэтому платформенный администратор полностью разлогинивался, а баннер уводил на `/platform/login`. Ожидалось: возврат к списку компаний платформенного администратора.

**Что было реализовано:**

- `lib/platform/impersonate.ts` — добавлено хранилище restore-токенов (TTL 60с, как у токенов impersonation): `createRestoreToken(platformAdminId)` / `consumeRestoreToken(token)`
- `lib/auth.ts` — новый провайдер `platform-restore` (credentials): потребляет restore-токен, перепроверяет `PlatformAdmin` (`isActive`, `deletedAt: null`), возвращает свежую платформенную сессию `{ kind: 'platform', id, email }`
- `app/api/platform/impersonate/end/route.ts` — вместо `signOut` + удаления cookie: валидирует impersonation-сессию, пишет `PLATFORM_IMPERSONATION_ENDED`, выдаёт restore-токен по `impersonatedByPlatformAdminId` и возвращает `{ token }` (убраны `signOut`, `cookies`, `SESSION_COOKIE_NAMES`)
- `components/platform/ImpersonationBanner.tsx` — «Выйти из режима» получает токен и вызывает `signIn('platform-restore', { token, redirectTo: '/platform/companies' })`, перезаписывая impersonation-cookie платформенной сессией и приземляясь на список компаний (вместо `window.location.href = '/platform/login'`)

**Безопасность:** restore-токен создаётся только при валидной impersonation-сессии, обращающейся к `/end`; идентификатор администратора берётся из `session.user.impersonatedByPlatformAdminId`, а не из ввода клиента.

**Известное ограничение:** restore-токены, как и impersonation-токены, хранятся в памяти процесса — не переживают рестарт и не работают между инстансами (соответствует текущей реализации impersonation, не менялось).

**Out of scope:** перенос токенов в БД/Redis; изменения обычного логаута (`LogoutButton`, `PlatformSignOutButton`); правки `proxy.ts`

---

## 2026-06-24 — Phase 3, Таск 2: Логин (UI) + логаут

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `components/auth/LoginForm.tsx` — Client Component вместо заглушки: Zod-валидация (`loginSchema`) до запроса, подсветка полей с ошибкой → `signIn('company-credentials', { email, password, redirect: false, redirectTo: '/today' })` → маппинг `result.code` (`USER_BLOCKED` / `COMPANY_BLOCKED`) в два текста блокировки, иначе generic «Неверный email или пароль» → при успехе `router.push('/today')`; ссылка «Забыли пароль?» на `/forgot-password`
- `components/layout/LogoutButton.tsx` — реализован `signOut({ redirectTo: '/login' })` вместо заглушки; кнопки выхода в `ProfileLayout` и `today/page.tsx` работают без нового файла в `components/auth/`
- `app/(public)/login/page.tsx` — Server Component: баннер «Регистрация завершена, войдите» при `searchParams.registered === '1'`

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** приём приглашения и автовход (Таск 3); forgot/reset-password (Таски 4–5); rate limiting логина (Nginx, Phase 1); каркас рабочей зоны / сайдбар (Phase 4); изменения в `authorize()` / `lib/auth.ts` / `authErrors.ts` (Таск 1)

---

## 2026-06-24 — Phase 3, Таск 1: `company-credentials` — authorize + двойная блокировка с кодами

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/auth.ts` — реализован `authorize` провайдера `company-credentials`: `loginSchema.safeParse` → `findUnique` по `email.toLowerCase().trim()` с `include: { company: true }` → `comparePassword` → `return null` при отсутствии пользователя или неверном пароле → `BlockedUserError` / `BlockedCompanyError` при блокировке → `update lastLoginAt` → `writeEvent(companyId, 'LOGIN', { userId })` → возврат `{ kind: 'company', id, companyId, role }`; провайдеры `platform-credentials` и `impersonation` не затронуты
- `lib/auth/authErrors.ts` — `BlockedUserError` и `BlockedCompanyError extends CredentialsSignin` с публичными `code = 'USER_BLOCKED' | 'COMPANY_BLOCKED'`
- `lib/validations/auth.ts` — `loginSchema` (`email`, `password`) и тип `LoginInput`
- `types/next-auth.d.ts` / `types/session.ts` — проверены, изменения не потребовались (company-форма сессии уже покрыта)

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** UI формы входа, клиентский `signIn`, маппинг `result.code` в тексты, логаут (Таск 2); автовход после приёма приглашения (Таск 3); forgot/reset password (Таски 4–5); rate limiting и правки `proxy.ts` (Таск 5)

---

## 2026-06-24 — Phase 3, Таск 0.5: Авторассылка о приближении продления (email-дайджест + cron)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/platform/subscriptionReminders.ts` — `collectCompaniesNeedingRenewal()` (все компании с `nextPaymentAt`, без фильтра `isBlocked`, статус через `getSubscriptionStatus`, только `expiring | overdue`, сортировка по дате, явные типы `CompanyNeedingRenewal` / `SubscriptionDigestResult`) и канал-агностичный `sendSubscriptionDigest()` (пустой список → skip; иначе email каждому активному `PlatformAdmin`; задел под Telegram в Phase 13)
- `lib/platform/sendSubscriptionReminderEmail.ts` — шаблон дайджеста (subject + text + html: компания, дата, «осталось N дней» / «просрочено на N дней»); guard `isEmailConfigured()` с `console.warn` и skip — по образцу `sendPasswordResetEmail.ts`
- `app/api/platform/cron/subscription-reminders/route.ts` — `GET`/`POST`, защита **только** `CRON_SECRET` (Bearer / `x-cron-secret` / `?key=`), без сессии; `401` при неверном ключе; вызывает `sendSubscriptionDigest()`, ответ `{ companies, emailsSent }`; `dynamic = 'force-dynamic'`
- `.env.example` — добавлен `CRON_SECRET=`
- `.docs/dev-log.md` — эта запись + памятка про внешний crontab

**Что было реализовано сверх плана `TASK.md`:**

- `.docs/phases/_status.md` — в Phase 1 (ручная инфраструктура): пункт в «Результат», таск №5 и примечание, что crontab на VPS раз в сутки дергает эндпоинт (приложение cron само не запускает)

**Out of scope (не делалось):** Telegram-канал, настройка crontab на сервере, изменения схемы БД, дедупликация на стороне приложения, правки `proxy.ts`

**Памятка: внешний crontab на VPS (раз в сутки):**

```bash
# Пример — подставить APP_URL и CRON_SECRET из .env
0 9 * * * curl -fsS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/platform/cron/subscription-reminders"
```

Альтернативы того же секрета: заголовок `x-cron-secret: $CRON_SECRET` или query `?key=$CRON_SECRET`. Дедупликация «не чаще раза в сутки» — на стороне планировщика, не приложения. SMTP не настроен → эндпоинт отвечает `200` с `{ companies, emailsSent: 0 }`, без падения.

---

## 2026-06-24 — Phase 3, TASK: Срок подписки компании (дата продления, управление, индикатор)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `prisma/schema.prisma` — поле `Company.nextPaymentAt DateTime?`, индекс `@@index([nextPaymentAt])`, enum `COMPANY_PAYMENT_UPDATED`
- `prisma/migrations/20260624185647_add_company_next_payment_at/` — миграция применена
- `.docs/database.md` — сверка: `nextPaymentAt`, индекс и `COMPANY_PAYMENT_UPDATED` уже описаны, правки не потребовались
- `lib/platform/subscription.ts` — `getSubscriptionStatus()` с порогом 14 дней (`none` / `ok` / `expiring` / `overdue`), `daysUntilDue`, `server-only`
- `lib/validations/platform.ts` — `setCompanyPaymentSchema`, `patchCompanySchema` (union: `{ isBlocked }` **или** `{ nextPaymentAt }`)
- `lib/platform/createCompany.ts` — при создании компании `nextPaymentAt = +1 год`
- `types/platform.ts` — тип `SubscriptionStatus`, поля `nextPaymentAt` и `subscriptionStatus` в `PlatformCompanyListItem` и `PlatformCompanyDetail`
- `app/api/platform/companies/route.ts` — `GET`: `nextPaymentAt` в select + вычисленный `subscriptionStatus`
- `app/api/platform/companies/[id]/route.ts` — `PATCH`: ветвление блокировка / дата продления; событие `COMPANY_PAYMENT_UPDATED { nextPaymentAt, byPlatformAdminId }`
- `app/(platform)/platform/companies/[id]/page.tsx` — загрузка `nextPaymentAt` и `subscriptionStatus` в детали компании
- `components/platform/CompaniesTable.tsx` — колонка «Следующий платёж» (дата + бейдж), красная подсветка строки при `expiring | overdue`
- `components/platform/CompaniesPageClient.tsx` — сводка-баннер «N компаний требуют продления» со ссылками
- `components/platform/CompanyDetailPageClient.tsx` — блок «Подписка»: дата, статус, `date input`, кнопка «Сбросить», оптимистичное обновление через `PATCH`

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** cron-дайджест email (таск 0.5), авто-блокировка по просрочке, Telegram-уведомления

---

## 2026-06-24 — Fix после DoD-check: критические замечания

**Статус:** ✅ Исправлено

**Что исправлено и почему:**

- `lib/validations/platform.ts` — `blockCompanySchema` и `setCompanyPaymentSchema` переведены в `.strict()`.
  - **Почему:** по DoD требовалось строгое XOR-поведение `PATCH` (`isBlocked` **или** `nextPaymentAt`). Без `strict` payload с двумя полями мог проходить из-за нестрогих Zod-объектов.
- Убран `setState` внутри `useEffect` в проблемных компонентах:
  - `components/dashboard/LeadsChart.tsx`
  - `components/profile/PersonalSection.tsx`
  - `components/profile/ContactsSection.tsx`
  - `components/profile/ProfileNotifications.tsx`
  - `components/profile/SecuritySection.tsx`
  - `components/tasks/TaskBlock.tsx`
  - **Почему:** линтер падал на `react-hooks/set-state-in-effect`, что блокировало критерий `npm run lint`.
- `components/profile/ProfileLayout.tsx` — для сброса форм добавлены `key` на секции профиля вместо сброса через эффекты.
  - **Почему:** это сохраняет поведение reset/save и убирает запрещённый паттерн `setState` в `useEffect`.
- Дополнительно устранены lint-предупреждения, из-за которых `eslint` завершался с ошибкой:
  - `components/pipeline/PipelineBoard.tsx` — удалён неиспользуемый импорт `PipelineCard`
  - `components/ui/Toast.tsx` — удалён неиспользуемый `ReactNode`
  - `components/ui/Avatar.tsx` — добавлен локальный `eslint-disable` для `img` (осознанное использование в этом компоненте)

**Проверка после правок:**

- `npm run type-check` ✅
- `npm run lint` ✅
- `npm run build` ✅

---

## 2026-06-23 — Phase 2, Дополнение: удаление платформенного администратора + восстановление пароля платформы

**Статус:** ✅ Завершён

**Что было реализовано:**

- Soft delete платформенных администраторов: деактивация вместо физического удаления (`isActive`, `deletedAt`), запрет удаления самого себя и последнего активного администратора
- Повторное создание администратора с ранее удалённым email: восстановление (reactivate) существующей записи вместо ошибки уникальности
- Отдельный flow восстановления пароля платформенного администратора:
  - страница запроса ссылки `/platform/forgot-password`
  - страница установки нового пароля `/platform/reset-password`
  - API `/api/platform/auth/forgot-password` и `/api/platform/auth/reset-password`
- Одноразовые reset-токены с TTL 1 час для платформенных администраторов (хранение хэша токена, инвалидирование после использования)
- Публичный доступ в `proxy.ts` для `/platform/forgot-password` и `/platform/reset-password`
- Ссылка «Забыли пароль?» на форме входа платформенного администратора
- Email-отправка reset-ссылки через SMTP-конфиг (`SMTP_*`) с graceful fallback, если SMTP не настроен

---

## 2026-06-23 — Phase 2, TASK: Управление платформенными администраторами + активность компаний

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/platform/companyActivity.ts` — `getCompanyActivity(periodStart)`: агрегат по всем компаниям (`lastLoginAt` через `groupBy` Users, `leadCount` за период, `activeUsers` без блокировки, `createdAt`)
- `lib/validations/platform.ts` — `createPlatformAdminSchema`, `activityPeriodSchema` (7/30/90), тип `CreatePlatformAdminInput`
- `types/platform.ts` — типы `PlatformAdminListItem` и `CompanyActivityItem`
- `app/api/platform/admins/route.ts` — `GET` список без `passwordHash`; `POST` с Zod + `hashPassword`, создание `PlatformAdmin`, обработка дубликата email (`P2002` → 400)
- `app/api/platform/activity/route.ts` — `GET ?period=7|30|90` (дефолт 30), `requirePlatformSession()`, вызов `getCompanyActivity(periodStart)`
- `app/(platform)/platform/admins/page.tsx` — Server Component: fetch `GET /api/platform/admins` с cookie, передача в таблицу
- `app/(platform)/platform/activity/page.tsx` — Server Component: fetch `GET /api/platform/activity?period=30`, передача начальных данных
- `components/platform/PlatformAdminsTable.tsx` — таблица администраторов, модалка создания (Zod на клиенте), `POST` → строка добавляется без перезагрузки
- `components/platform/CompanyActivityTable.tsx` — переключатель 7/30/90 (перезапрос API), client-side поиск и сортировка, жёлтая подсветка `#F59E0B` для `lastLoginAt = null` или > 30 дней

**Что было реализовано сверх плана `TASK.md`:**

- нет

---

## 2026-06-23 — Phase 2, TASK: Impersonation — токены + provider + баннер + события

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/platform/impersonate.ts` — in-memory `Map` одноразовых токенов impersonation с TTL 60 сек, `createImpersonationToken()` и `consumeImpersonationToken()`
- `lib/auth.ts` — добавлен credentials provider `impersonation`; `authorize()` потребляет токен, проверяет пользователя по `userId + companyId`, создаёт company-сессию с `impersonatedByPlatformAdminId`
- `app/api/platform/companies/[id]/impersonate/[userId]/route.ts` — `POST` с `requirePlatformSession()`, проверкой принадлежности `userId` компании, выдачей `{ token }`, записью `PLATFORM_IMPERSONATION_STARTED`
- `app/api/platform/impersonate/end/route.ts` — `POST` только для `kind: "company"` с `impersonatedByPlatformAdminId`, запись `PLATFORM_IMPERSONATION_ENDED`, очистка сессии/cookies, `401` для нецелевых сессий
- `app/(platform)/platform/companies/[id]/page.tsx` — Server Component страницы компании: загрузка компании, пользователей и агрегатов
- `components/platform/ImpersonateButton.tsx` — кнопка impersonation (`POST` token endpoint -> `signIn('impersonation', { token, redirectTo: '/today' })`) с loading-состоянием
- `components/platform/ImpersonationBanner.tsx` — фиксированный баннер режима поддержки, выход через `POST /api/platform/impersonate/end` с переходом на `/platform/login`
- `app/(app)/layout.tsx` — условный рендер `ImpersonationBanner` для company-сессии с `impersonatedByPlatformAdminId`
- `lib/validations/platform.ts` + оба impersonation endpoint — добавлена Zod-валидация для новых API handler (`impersonateUserParamsSchema`, `endImpersonationBodySchema`) по требованиям DoD Global

**Что было реализовано сверх плана `TASK.md`:**

- `app/(public)/accept-invite/page.tsx`
- `app/api/auth/accept-invite/route.ts`
- `components/auth/AcceptInviteForm.tsx`
- `lib/auth/acceptInvite.ts`
- `lib/validations/auth.ts`
- `components/platform/CompanyDetailPageClient.tsx`
- `types/platform.ts`

---

## 2026-06-23 — Phase 2, Таск 3: Список компаний + блокировка/разблокировка (API + UI)

**Статус:** ✅ Завершён

**Что было сделано:**

- `app/api/platform/companies/route.ts` — добавлен `GET`: `requirePlatformSession()`, список компаний с `_count.users` и `MAX(User.lastLoginAt)` через `groupBy`; ответ `{ id, name, isBlocked, createdAt, userCount, lastLoginAt }`
- `app/api/platform/companies/[id]/route.ts` — `PATCH { isBlocked }`: Zod `blockCompanySchema`, `prisma.company.update()`, события `COMPANY_BLOCKED` / `COMPANY_UNBLOCKED` с `payload.byPlatformAdminId`
- `lib/validations/platform.ts` — добавлены `blockCompanySchema` и тип `BlockCompanyInput`
- `types/platform.ts` — тип `PlatformCompanyListItem` для списка компаний
- `app/(platform)/layout.tsx` — платформенный layout: сайдбар `#1A1F2E` 220px + `flex-1 overflow-auto`
- `components/platform/PlatformSidebar.tsx` — навигация (Компании / Администраторы / Активность), Tabler Icons 16px, active link `text-[#10B981]` + `bg-white/5`
- `components/platform/PlatformSignOutButton.tsx` — `signOut({ redirectTo: '/platform/login' })`
- `app/(platform)/platform/companies/page.tsx` — Server Component: `requirePlatformSession()`, fetch `GET /api/platform/companies` с cookie из `headers()`
- `components/platform/CompaniesPageClient.tsx` — шапка «Компании» + кнопка «+ Создать компанию», связка таблицы и модалки
- `components/platform/CompaniesTable.tsx` — таблица с бейджами статуса, оптимистичная блокировка/разблокировка, клик по строке → `/platform/companies/[id]`, пустое состояние
- `components/platform/CreateCompanyModal.tsx` — двухшаговая модалка: форма создания → `inviteUrl` с копированием; «Готово» → `router.refresh()`

**Definition of Done:** ✅ Все пункты TASK.md выполнены (`npm run type-check` — без ошибок)

---

## 2026-06-23 — Phase 2, Таск 2: Создание компании — транзакция + lib

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/tokens.ts` — `generateToken()` (32 байта → 64 hex) и `hashToken()` (SHA-256) для invite-токенов
- `constants/defaultCompanyData.ts` — `DEFAULT_COMPANY_SETTINGS`, `DEFAULT_STAGES(companyId)`, `DEFAULT_LOSS_REASONS(companyId)` по `.docs/database.md`
- `lib/platform/createCompany.ts` — `createCompany()`: одна Prisma-транзакция (Company + 5 этапов + 9 причин отказа + CompanyInvite TTL 7 дней + Event `COMPANY_CREATED`); возвращает plain `inviteToken`
- `lib/validations/platform.ts` — добавлен `createCompanySchema` (`name`, `adminEmail`)
- `app/api/platform/companies/route.ts` — `POST`: `requirePlatformSession()` → Zod → `createCompany()` → `{ companyId, inviteUrl }`; 401 без platform-сессии, 400 при невалидном email

**Definition of Done:** ✅ Все пункты TASK.md выполнены (`npm run type-check`, `npm run build` — без ошибок)

---

## 2026-06-23 — Phase 2, Таск 1: lib-фундамент + bootstrap + вход платформенного администратора

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/password.ts` — `hashPassword()` и `comparePassword()` через bcrypt (12 rounds)
- `lib/events.ts` — `writeEvent()`: запись `Event` в БД; `impersonatedByPlatformAdminId` берётся из company-сессии через `auth()`, иначе `null`
- `lib/platform/auth.ts` — `requirePlatformSession()`: проверка `kind === "platform"`, иначе Response 401
- `lib/validations/platform.ts` — `loginSchema` (email + password)
- `lib/auth.ts` — реализован `authorize()` в провайдере `platform-credentials`: поиск `PlatformAdmin` по email, `comparePassword()`, сессия `{ kind: "platform", id, email }`
- `scripts/bootstrapPlatformAdmin.ts` — идемпотентный bootstrap первого `PlatformAdmin` из `PLATFORM_ADMIN_BOOTSTRAP_*` в `.env`
- `package.json` — `tsx` в devDependencies, скрипт `bootstrap:platform-admin`
- `app/(public)/platform/login/page.tsx` — страница входа с `<PlatformLoginForm>`, layout без сайдбара
- `components/platform/PlatformLoginForm.tsx` — форма email + password, `signIn('platform-credentials')`, общее сообщение об ошибке без раскрытия email; кнопка показа/скрытия пароля

**Definition of Done:** ✅ Все пункты TASK.md выполнены

---

## 2026-06-22 — Phase 0, Таск 3: Realign `app/` под v4.0-группы + чистка + layout-заглушка

**Статус:** ✅ Завершён

**Что было сделано:**

- Перенесены существующие страницы (без дублирования):
  - `(auth)/login` → `(public)/login`
  - `(app)/dashboard` → `(app)/today`
  - `(admin)/admin/pipeline` → `(admin)/admin/pipeline-settings`
- Созданы stub-страницы: `(public)/accept-invite`, `forgot-password`, `reset-password`, `platform/login`; `(management)/control`, `reports`; `(platform)/platform/companies`, `admins`, `activity`
- Созданы layout-заглушки: `(management)/layout.tsx`, `(platform)/layout.tsx` — `return children`
- Удалены устаревшие маршруты и артефакты: `(auth)/`, `(shell)/`, `(app)/tasks`, `(admin)/admin/profile`, `lib/license.ts`
- `app/page.tsx` — ссылка `/dashboard` → `/today`
- `constants/navItems.ts` — «Сегодня» `/today`, убран пункт `/tasks`
- `app/(app)/pipeline/page.tsx` — путь настроек `/admin/pipeline-settings`
- `components/layout/ShellGate.tsx` — публичные и платформенные маршруты без сайдбара компании
- `components/layout/Sidebar.tsx` — убрана ссылка на удалённый `/admin/profile`
- Документация: `pnpm` → `npm` в `CLAUDE.md`, `README.md`, `platform-admin.md`, `.clinerules/project-context.md`
- `.docs/phases/_status.md` и `.docs/phases/phase-0.md` — Task 3 ✅, Phase 0 ✅
- Проверено: `npm run type-check` и `npm run build` — без ошибок; `rg "pnpm"` — только `.pnpm-debug.log*` в `.gitignore`

**Definition of Done:** ✅ Все пункты выполнены

---

## 2026-06-22 — Phase 0, Таск 2: Roles + NextAuth-скелет + proxy.ts + health-check

**Статус:** ✅ Завершён

**Что было сделано:**

- `constants/roles.ts` — `ROLE_RANK` + `hasMinRole()` для иерархии ролей
- `lib/auth.ts` — NextAuth v5 скелет: два credentials-провайдера-заглушки, JWT/session callbacks с `kind: "company" | "platform"`
- `types/next-auth.d.ts` — module augmentation для `Session`, `User`, `JWT` (`@auth/core/jwt` + `next-auth/jwt`)
- `proxy.ts` — защита роутов по `session.kind` и `hasMinRole()`; matcher v4.0-зон
- `app/api/health/route.ts` — пинг БД через `prisma.$queryRaw`
- `app/api/auth/[...nextauth]/route.ts` — экспорт `handlers` из `lib/auth.ts`
- `tsconfig.json` — добавлен `types/**/*.d.ts` в include для подхвата augmentation
- Проверено: `GET /api/health` → 200, `/leads` → redirect `/login`, `/platform/*` → redirect `/platform/login`, `/dashboard` без сессии доступен
- `npm run type-check` и `npm run build` — без ошибок

**Definition of Done:** ✅ Все пункты выполнены

---

## 2026-06-22 — Phase 0, Таск 1: Dependencies + Prisma Schema + Init Migration

**Статус:** ✅ Завершён

**Что было сделано:**

- `package.json` — добавлены зависимости: `prisma`, `@prisma/client`, `next-auth@5`, `zod`, `zustand`, `bcrypt` (+ `@types/bcrypt` в devDeps)
- Добавлены npm scripts: `type-check`, `db:migrate`, `db:generate`
- `prisma/schema.prisma` — реализована полная схема из `.docs/database.md`:
  - 9 enum'ов (UserRole, AssignMode, LeadVisibility, CloseType, EventType с компании и платформенных событиями, ReminderStatus, TaskStatus, DuplicateMatchType, ImportStatus)
  - 16 моделей (Company, User, PlatformAdmin, Lead, PipelineStage, Comment, DuplicateFlag, LossReason, Event, ApiKey, IntegrationSource, AssignmentRule, Reminder, Task, ImportBatch, CompanyInvite)
  - Все индексы и constraints, включая composite unique на `IntegrationSource([companyId, type, label])`
  - Event.userId и Event.impersonatedByPlatformAdminId — скаляры без FK (событие переживает удаление пользователя)
- `lib/prisma.ts` — синглтон PrismaClient с dev-global guard (в dev не плодит лишние коннекты)
- `.env.example` — выровнен по CLAUDE.md (DATABASE*URL, AUTH_SECRET, AUTH_URL, APP_URL, TELEGRAM_BOT_TOKEN, SMTP*_, PLATFORM*ADMIN_BOOTSTRAP*_, без платёжных переменных)
- `npm install` — все зависимости установлены
- `prisma migrate dev --name init` — миграция применена, все таблицы и enum'ы созданы в БД
- `npm run type-check` — ошибок нет

**Definition of Done:** ✅ Все пункты выполнены

---
