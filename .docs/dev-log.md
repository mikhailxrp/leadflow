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

- `constants/fieldAliases.ts` — карта `FIELD_ALIASES` (name/имя/фио, phone/телефон/tel, email/e-mail/почта, comment/комментарий/сообщение и др.); набор `MARKETING_FIELDS` (gclid, yclid, fbclid, roistat, _ym_uid и др.) для `Lead.marketing`
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
