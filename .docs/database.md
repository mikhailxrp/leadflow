# Database Schema

> Источник правды по схеме БД проекта. Все Prisma-модели, enum'ы, связи, сидеры и критичные транзакции — здесь, полностью, без сокращений «без изменений, см. предыдущую версию» — этот файл должен быть самодостаточным: всё, что нужно для `schema.prisma`, лежит в нём целиком.
> При расхождениях между этим файлом и любым модулем `.docs/modules/*` — верно то, что в этом файле.
>
> **v4.0**

---

## Содержание

1. [Принцип мультитенантности](#принцип-мультитенантности)
2. [Платформенный уровень — отдельно от компаний](#платформенный-уровень--отдельно-от-компаний)
3. [Enums](#enums)
4. [Модель: Компания](#модель-компания)
5. [Модели: Пользователи и платформенный администратор](#модели-пользователи-и-платформенный-администратор)
6. [Модели: Лиды и воронка](#модели-лиды-и-воронка)
7. [Модели: Дубли и причины отказа](#модели-дубли-и-причины-отказа)
8. [Модель: Журнал событий](#модель-журнал-событий)
9. [Модели: Интеграции и распределение](#модели-интеграции-и-распределение)
10. [Модели: Напоминания, задачи, импорт](#модели-напоминания-задачи-импорт)
11. [Модель: Приглашение в компанию](#модель-приглашение-в-компанию)
12. [Схема связей](#схема-связей)
13. [Создание компании и приглашение администратора](#создание-компании-и-приглашение-администратора)
14. [Вход от имени компании (impersonation)](#вход-от-имени-компании-impersonation)
15. [Критичные транзакции](#критичные-транзакции)
16. [Индексы](#индексы)
17. [Миграции](#миграции)

---

## Принцип мультитенантности

Каждая прикладная таблица содержит `companyId`. Любой запрос к данным фильтруется по `companyId` из сессии — запрос без `where: { companyId }` считается багом. Компании создаются не самостоятельной регистрацией, а платформенным администратором (раздел 13) — это меняет **кто** создаёт компанию, не сам принцип изоляции тенанта.

**Что не меняется версия за версией:** гибкие поля форм (`utm`, `marketing`, `customFields`) в JSONB без потерь; дедупликация — только пометка без слияния (`DuplicateFlag`); Event Sourcing (`events`) как единственный источник истории; «лид нельзя потерять» — главный инвариант, который не нарушает ни приём данных, ни блокировка компании.

**Что окончательно убрано в этой версии:** тарифы и фичагейты по ним, оплата (ЮKassa/Robokassa), WhatsApp как источник лидов. Действующих компаний с тарифами/оплатой/WhatsApp-источниками, которые нужно было бы мигрировать, не существует — это не апгрейд, а новая схема. Поле `Company.nextPaymentAt` (дата продления по офлайн-договору) — **не возврат биллинга**: это ручное напоминание о сроке без процессинга, тарифов и фичагейтов (см. «Срок подписки компании»).

---

## Платформенный уровень — отдельно от компаний

`PlatformAdmin` — **не `User`**. У `User.companyId` обязательное поле (каждый пользователь принадлежит ровно одной компании) — городить туда nullable-исключение для одной специальной сущности означало бы городить особый случай в каждом запросе, который фильтрует пользователей по `companyId`. Платформенный администратор технически и логически не часть ни одной компании, поэтому у него отдельная таблица, отдельный логин (`/platform/login`), отдельная сессия.

**Что может платформенный администратор:**

```
Создавать компании и приглашать первого администратора
Блокировать/разблокировать любую компанию (Company.isBlocked) без удаления данных
Видеть лиды, события, настройки любой компании — БЕЗ права редактировать их напрямую вне обычного UI
Входить от имени компании (impersonation) — это и есть способ "вмешаться", не прямое редактирование чужой БД
Видеть отчёты об активности компаний (не о лидах): когда последний раз заходили, сколько лидов в этом месяце, сколько активных пользователей
Создавать других платформенных администраторов — их может быть больше одного
```

**Чего платформенный администратор НЕ делает:** не получает уведомления о лидах, не назначается ответственным, не участвует в эскалации первого ответа — для него лиды не существуют как рабочий процесс, только как данные для диагностики.

---

## Enums

```prisma
enum UserRole {
  MANAGER   // свои лиды; свои задачи; свои просрочки; доступная история
  HEAD      // + все лиды; все сотрудники; контроль; отчёты; распределение нагрузки
  ADMIN     // + настройки; пользователи; поля; этапы; источники; нормативы; права доступа
}

enum AssignMode {
  MANUAL
  ROUND_ROBIN
}

enum LeadVisibility {
  ALL
  OWN
}
// Применяется ТОЛЬКО к роли MANAGER. HEAD и ADMIN видят все лиды компании всегда,
// независимо от этого переключателя — "все лиды" входит в само определение роли HEAD.

enum CloseType {
  WON
  LOST
}

enum EventType {
  LEAD_CREATED
  STAGE_CHANGED
  ASSIGNED
  ASSIGNMENT_FAILED
  COMMENTED
  LEAD_UPDATED
  LEAD_DELETED
  LEAD_TAKEN_IN_WORK
  LEAD_WON
  LEAD_LOST
  DUPLICATE_FLAGGED
  USER_CREATED
  USER_BLOCKED
  USER_UNBLOCKED
  USER_DELETED
  LOGIN
  LEAD_OPENED
  REMINDER_CREATED
  REMINDER_FIRED
  REMINDER_FAILED
  REMINDER_CANCELLED
  LEAD_REACTION_REMINDED
  LEAD_REACTION_OVERDUE
  LEAD_REACTION_ESCALATED
  LEAD_STAGE_STUCK
  TASK_CREATED
  TASK_UPDATED
  TASK_DONE
  TASK_CANCELLED
  IMPORT_COMPLETED
  IMPORT_ROLLED_BACK
  SOURCE_DOWN
  SOURCE_RECOVERED
  COMPANY_CREATED
  COMPANY_BLOCKED
  COMPANY_UNBLOCKED
  COMPANY_PAYMENT_UPDATED
  PLATFORM_IMPERSONATION_STARTED
  PLATFORM_IMPERSONATION_ENDED
}

enum ReminderStatus {
  PENDING
  FIRED
  CANCELLED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
  CANCELLED
}

enum DuplicateMatchType {
  PHONE
  EMAIL
}

enum ImportStatus {
  PROCESSING
  DONE
  ROLLED_BACK
}
```

**Роли — иерархия, не три изолированных набора прав.** `ADMIN` включает всё, что может `HEAD`, `HEAD` включает всё, что может `MANAGER`. У пользователя одно значение роли, не набор. Порядок задаётся явно в коде, не самим enum'ом:

```typescript
// constants/roles.ts
export const ROLE_RANK: Record<UserRole, number> = { MANAGER: 0, HEAD: 1, ADMIN: 2 };
export function hasMinRole(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
```

Любая проверка доступа в коде — `hasMinRole(session.user.role, "HEAD")`, не явное перечисление `role === "ADMIN" || role === "HEAD"`. При добавлении новой роли в будущем меняется только этот файл.

`LeadSource` (поле `Lead.source`) — строка, не enum, без миграций при добавлении нового канала: `"tilda" | "wordpress" | "yandex" | "api" | "manual" | "other" | "import"`. WhatsApp как значение убран.

---

## Модель: Компания

```prisma
model Company {
  id         String   @id @default(cuid())
  name       String
  isBlocked  Boolean  @default(false)
  settings   Json     @default("{}")
  createdAt  DateTime @default(now())
  nextPaymentAt DateTime?

  users               User[]
  leads               Lead[]
  stages              PipelineStage[]
  apiKeys             ApiKey[]
  events              Event[]
  reminders           Reminder[]
  tasks               Task[]
  lossReasons         LossReason[]
  duplicateFlags      DuplicateFlag[]
  importBatches       ImportBatch[]
  integrationSources  IntegrationSource[]
  assignmentRules     AssignmentRule[]
  invites             CompanyInvite[]

  @@index([nextPaymentAt])
}
```

### Блокировка компании

```
isBlocked = true  → ни один пользователь компании не может войти (проверка в authorize(), как и User.isBlocked)
                  → приём лидов по вебхукам ПРОДОЛЖАЕТ работать как обычно
                  → данные не изменяются и не удаляются
isBlocked = false → доступ восстановлен с следующего входа
```

**Почему приём лидов не блокируется:** главный принцип «лид нельзя потерять» применяется и к блокировке компании. Если блокировка временная, все лиды, пришедшие за это время, должны быть на месте при разблокировке.

**Блокировка применяется на входе, не на каждый запрос.** Если компанию заблокировали посреди активной сессии пользователя, сессия не обрывается мгновенно — эффект наступает со следующего входа. Сознательное упрощение: блокировка — административное действие, не требующее ревалидации на каждый запрос.

### Срок подписки компании (продление по офлайн-договору)

`Company.nextPaymentAt` — дата следующего платежа по годовому **офлайн-договору**. Это **не биллинг**: нет платёжного процессинга, тарифов, фичагейтов и самооплаты — только дата-напоминание, которой вручную управляет платформенный администратор (см. `.docs/modules/platform-admin.md`).

- Устанавливается/меняется/сбрасывается платформенным администратором; nullable (у существующих компаний и до установки — пусто). При создании компании по умолчанию `= +1 год`.
- **Статус продления вычисляется, не хранится** (как риск): из `nextPaymentAt` относительно текущей даты — `none` (не задано) / `ok` / `expiring` (≤ 14 дней до даты) / `overdue` (дата прошла).
- `expiring | overdue` → компания выделяется красным в списке и карточке на `/platform/*` и попадает в ежедневный email-дайджест платформенным администраторам.
- **Срок не влияет на доступ:** просрочка не блокирует вход и не останавливает приём лидов — блокировать компанию остаётся отдельным ручным действием (`isBlocked`).
- Изменение даты пишет событие `COMPANY_PAYMENT_UPDATED { nextPaymentAt, byPlatformAdminId }`.

### Структура `settings` (JSONB)

```typescript
type CompanySettings = {
  assignMode: "MANUAL" | "ROUND_ROBIN";
  leadVisibility: "ALL" | "OWN";        // применяется только к MANAGER
  roundRobinCursor: string | null;
  telegramEnabled: boolean;
  yandexMode?: "UTM" | "FULL";

  controlEnabled: boolean;
  reactionNorms: {
    defaultMinutes: number;
    reminderBeforePercent: number;
    escalateAfterPercent: number;
    bySource?: Record<string, number>;
    byStage?: Record<string, number>;
    byUser?: Record<string, number>;
    workHoursOnly: boolean;
  };
  workHours?: { start: string; end: string; days: number[] };
  stageStuckDaysDefault: number;
  stuckCheckTime: string;
  sourceHealthThresholdHours: number;
};
```

### Дефолты при создании компании

```json
{
  "assignMode": "MANUAL",
  "leadVisibility": "ALL",
  "roundRobinCursor": null,
  "telegramEnabled": false,
  "yandexMode": "UTM",
  "controlEnabled": false,
  "reactionNorms": { "defaultMinutes": 30, "reminderBeforePercent": 66, "escalateAfterPercent": 133, "workHoursOnly": false },
  "stageStuckDaysDefault": 5,
  "stuckCheckTime": "09:00",
  "sourceHealthThresholdHours": 3
}
```

---

## Модели: Пользователи и платформенный администратор

### `User`

```prisma
model User {
  id                      String    @id @default(cuid())
  companyId               String
  email                   String    @unique
  passwordHash            String
  name                    String
  role                    UserRole  @default(MANAGER)
  isBlocked               Boolean   @default(false)
  telegramChatId          String?
  notificationPreferences Json      @default("{}")
  lastLoginAt             DateTime?
  createdAt               DateTime  @default(now())

  company          Company          @relation(fields: [companyId], references: [id])
  assignedLeads    Lead[]           @relation("AssignedManager")
  comments         Comment[]
  tasksCreated     Task[]           @relation("TaskCreator")
  tasksAssigned    Task[]           @relation("TaskAssignee")
  remindersCreated Reminder[]
  importBatches    ImportBatch[]
  rulesAsAssignee  AssignmentRule[] @relation("RuleAssignee")
  rulesAsFallback  AssignmentRule[] @relation("RuleFallback")

  @@index([companyId])
  @@index([role])
}
```

`lastLoginAt` обновляется при каждом успешном входе — нужен платформенному администратору для отчёта об активности компаний, не используется в логике внутри компании. Лимита на число пользователей нет — тарифов больше нет.

### `PlatformAdmin`

```prisma
model PlatformAdmin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
}
```

Полностью отдельная от `User` сущность — нет `companyId`, нет внутренней иерархии ролей (любой платформенный администратор обладает полным набором платформенных прав). Первая запись создаётся одноразовым bootstrap-скриптом при первом деплое (раздел 13), не публичной регистрацией. Дальше существующий платформенный администратор создаёт следующих через `/platform/admins`.

---

## Модели: Лиды и воронка

### `Lead`

```prisma
model Lead {
  id            String        @id @default(cuid())
  companyId     String
  name          String?
  phone         String?
  email         String?
  comment       String?
  source        String
  stageId       String
  assignedToId  String?
  utm           Json          @default("{}")
  marketing     Json          @default("{}")
  customFields  Json          @default("{}")
  closeType     CloseType?
  closedAt      DateTime?
  lossReasonId  String?
  importBatchId String?
  createdAt     DateTime      @default(now())

  company       Company       @relation(fields: [companyId], references: [id])
  stage         PipelineStage @relation(fields: [stageId], references: [id])
  assignedTo    User?         @relation("AssignedManager", fields: [assignedToId], references: [id])
  lossReason    LossReason?   @relation(fields: [lossReasonId], references: [id])
  importBatch   ImportBatch?  @relation(fields: [importBatchId], references: [id])
  comments      Comment[]
  events        Event[]
  reminders     Reminder[]
  tasks         Task[]
  duplicateFlagsAsLead    DuplicateFlag[] @relation("FlaggedLead")
  duplicateFlagsAsMatched DuplicateFlag[] @relation("MatchedLead")

  @@index([companyId])
  @@index([stageId])
  @@index([assignedToId])
  @@index([name])
  @@index([phone])
  @@index([email])
  @@index([createdAt])
  @@index([closeType])
}
```

**Закрытие (`closeType`/`closedAt`/`lossReasonId`)** — действие, не привязанное к конкретному этапу воронки: закрыть сделкой или отказом можно с любого этапа, кнопками в карточке. Закрытие отказом без `lossReasonId` отклоняется на уровне API.

**Дедупликация не выполняется автоматически.** Совпадение по телефону/email с другим лидом той же компании создаёт `DuplicateFlag` (пометку), лид всё равно сохраняется — слияние записей не реализуется, один человек может оставлять разные обращения.

### `PipelineStage`

```prisma
model PipelineStage {
  id                 String   @id @default(cuid())
  companyId          String
  name               String
  color              String
  order              Int
  stageTimeLimitDays Int?
  createdAt          DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])
  leads   Lead[]

  @@index([companyId])
  @@index([order])
}
```

Этапы — данные, не код. 5 дефолтных этапов создаются при создании компании. `stageTimeLimitDays`, если задан, переопределяет `Company.settings.stageStuckDaysDefault` для этого конкретного этапа.

### `Comment`

```prisma
model Comment {
  id        String   @id @default(cuid())
  leadId    String
  userId    String
  text      String
  createdAt DateTime @default(now())

  lead Lead @relation(fields: [leadId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@index([leadId])
}
```

---

## Модели: Дубли и причины отказа

### `DuplicateFlag`

```prisma
model DuplicateFlag {
  id            String             @id @default(cuid())
  companyId     String
  leadId        String
  matchedLeadId String
  matchType     DuplicateMatchType
  createdAt     DateTime           @default(now())

  company     Company @relation(fields: [companyId], references: [id])
  lead        Lead    @relation("FlaggedLead", fields: [leadId], references: [id], onDelete: Cascade)
  matchedLead Lead    @relation("MatchedLead", fields: [matchedLeadId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([leadId])
  @@index([matchedLeadId])
}
```

### `LossReason`

```prisma
model LossReason {
  id        String   @id @default(cuid())
  companyId String
  label     String
  order     Int
  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])
  leads   Lead[]

  @@index([companyId])
}
```

Дефолтный набор создаётся при создании компании: Дорого, Выбрал конкурента, Не удалось связаться, Нецелевой, Нет бюджета, Отложил, Не подошли условия, Дубль, Другое.

---

## Модель: Журнал событий

```prisma
model Event {
  id                            String    @id @default(cuid())
  companyId                     String
  leadId                        String?
  userId                        String?
  type                          EventType
  payload                       Json      @default("{}")
  impersonatedByPlatformAdminId String?
  createdAt                     DateTime  @default(now())

  company Company @relation(fields: [companyId], references: [id])
  lead    Lead?   @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([leadId])
  @@index([type])
  @@index([createdAt])
  @@index([impersonatedByPlatformAdminId])
}
```

Append-only, пишет только сервер через `lib/events.ts`, переживает удаление пользователя (`userId` не каскадный). `**impersonatedByPlatformAdminId**` — не замена `userId`, а аннотация: действие всё равно записывается от имени реального пользователя компании (иначе история лида перестанет быть консистентной), но дополнительно помечено, если физически выполнено поддержкой через impersonation (раздел 14).

---

## Модели: Интеграции и распределение

### `ApiKey`

```prisma
model ApiKey {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  keyHash     String
  sourceLabel String
  createdAt   DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
}
```

### `IntegrationSource`

```prisma
model IntegrationSource {
  id          String    @id @default(cuid())
  companyId   String
  type        String    // "tilda" | "wordpress" | "api" — строка, как Lead.source
  label       String    @default("") // sourceLabel конкретного ApiKey; "" — для источников без концепции label
  lastUsedAt  DateTime?
  lastErrorAt DateTime?
  errorCount  Int       @default(0)
  createdAt   DateTime  @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, type, label])
  @@index([companyId])
  @@index([lastUsedAt])
}
```

`@@unique([companyId, type, label])` — даёт composite-ключ `companyId_type_label` для `upsert` в `touchIntegrationSource()` (см. `.docs/modules/leads-intake.md`). `label` не nullable (дефолт `""`) — в Postgres `NULL` в уникальном индексе не считается равным другому `NULL`, что сломало бы уникальность для источников без `label`.

### `AssignmentRule`

```prisma
model AssignmentRule {
  id               String   @id @default(cuid())
  companyId        String
  matchSource      String?
  matchSourceLabel String?
  assignToId       String
  fallbackToId     String?
  priority         Int
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())

  company    Company @relation(fields: [companyId], references: [id])
  assignTo   User    @relation("RuleAssignee", fields: [assignToId], references: [id])
  fallbackTo User?   @relation("RuleFallback", fields: [fallbackToId], references: [id])

  @@index([companyId])
  @@index([priority])
}
```

---

## Модели: Напоминания, задачи, импорт

### `Reminder`

```prisma
model Reminder {
  id          String         @id @default(cuid())
  companyId   String
  leadId      String
  createdById String
  text        String
  remindAt    DateTime
  channels    Json           @default("[]")
  status      ReminderStatus @default(PENDING)
  firedAt     DateTime?
  createdAt   DateTime       @default(now())

  company   Company @relation(fields: [companyId], references: [id])
  lead      Lead    @relation(fields: [leadId], references: [id], onDelete: Cascade)
  createdBy User    @relation(fields: [createdById], references: [id])

  @@index([companyId])
  @@index([leadId])
  @@index([status, remindAt])
}
```

`channels` — `["telegram", "email"]`, JSONB, не enum — новый канал добавляется файлом в `lib/reminders/channels/`, без миграции.

### `Task`

```prisma
model Task {
  id           String     @id @default(cuid())
  companyId    String
  leadId       String
  createdById  String
  assignedToId String
  title        String
  description  String?
  dueDate      DateTime?
  status       TaskStatus @default(TODO)
  completedAt  DateTime?
  createdAt    DateTime   @default(now())

  company    Company @relation(fields: [companyId], references: [id])
  lead       Lead    @relation(fields: [leadId], references: [id], onDelete: Cascade)
  createdBy  User    @relation("TaskCreator", fields: [createdById], references: [id])
  assignedTo User    @relation("TaskAssignee", fields: [assignedToId], references: [id])

  @@index([companyId])
  @@index([leadId])
  @@index([assignedToId])
  @@index([status])
  @@index([dueDate])
}
```

Самая ранняя открытая задача (`status IN (TODO, IN_PROGRESS)`) лида — это и есть «следующее действие», отображаемое в карточке/списке/«Сегодня» (см. `.docs/modules/risk.md`, `.docs/modules/tasks.md`) — отдельного поля под это не существует.

### `ImportBatch`

```prisma
model ImportBatch {
  id          String       @id @default(cuid())
  companyId   String
  createdById String
  fileName    String
  status      ImportStatus @default(PROCESSING)
  totalRows   Int          @default(0)
  imported    Int          @default(0)
  skipped     Int          @default(0)
  duplicates  Int          @default(0)
  errors      Int          @default(0)
  createdAt   DateTime     @default(now())

  company   Company @relation(fields: [companyId], references: [id])
  createdBy User    @relation(fields: [createdById], references: [id])
  leads     Lead[]

  @@index([companyId])
}
```

---

## Модель: Приглашение в компанию

```prisma
model CompanyInvite {
  id        String    @id @default(cuid())
  companyId String
  email     String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
}
```

Заменяет публичную самостоятельную регистрацию компаний, которой больше нет. Подробности флоу — раздел 13.

---

## Схема связей

```
PlatformAdmin (вне компаний)
   └─ создаёт/блокирует Company, входит как любой User любой Company (impersonation, не FK-связь)

Company ──< User (role: MANAGER | HEAD | ADMIN) ──< Comment
   │         ├──< Lead (assignedTo, nullable)
   │         ├──< Reminder (createdBy)
   │         ├──< Task (createdBy + assignedTo)
   │         └──< ImportBatch (createdBy)
   │
   ├──< Lead >── PipelineStage
   │     ├──< Comment / Event / Reminder / Task
   │     ├──< DuplicateFlag (как leadId и как matchedLeadId)
   │     ├──> LossReason (nullable)
   │     └──> ImportBatch (nullable)
   │
   ├──< PipelineStage / ApiKey / IntegrationSource / AssignmentRule
   ├──< LossReason / DuplicateFlag / ImportBatch / Event
   └──< CompanyInvite

Event ──> PlatformAdmin (impersonatedByPlatformAdminId, nullable — аннотация, не основной FK)
```

---

## Создание компании и приглашение администратора

### Флоу

```
1. Платформенный администратор → POST /api/platform/companies { name, adminEmail }
2. Транзакция:
   - создаётся Company (isBlocked: false, settings: дефолты)
   - создаются 5 дефолтных этапов воронки (DEFAULT_STAGES)
   - создаётся дефолтный набор причин отказа (DEFAULT_LOSS_REASONS)
   - создаётся CompanyInvite { companyId, email: adminEmail, tokenHash, expiresAt: +7 дней }
   - событие COMPANY_CREATED
3. Клиенту передаётся ссылка /accept-invite?token=... (вручную или письмом)
4. Клиент открывает ссылку, задаёт себе пароль и имя → POST /api/auth/accept-invite
   - создаётся User { companyId, email, passwordHash, role: ADMIN }
   - CompanyInvite.usedAt = now()
5. Автоматический вход, редирект на /today
```

**Платформенный администратор никогда не знает и не задаёт пароль клиента** — для доступа внутрь компании есть impersonation (раздел 14), не общий пароль. Полная спецификация UI/API — `.docs/modules/platform-admin.md` (создание компании) и `.docs/modules/auth.md` (приём приглашения, вход).

---

## Вход от имени компании (impersonation)

### Назначение

Платформенному администратору нужно «попасть внутрь» компании, чтобы помочь настроить систему или разобраться в проблеме — без знания пароля клиента и без прямого редактирования чужих данных мимо обычного прикладного кода.

### Механика

```
POST /api/platform/companies/:companyId/impersonate/:userId
  → платформенный админ выбирает компанию и конкретного пользователя (обычно — первого ADMIN компании,
    но может выбрать любого, например, чтобы воспроизвести баг от лица конкретного менеджера)
  → создаётся обычная сессия КАК этот User (тот же session.user.id, та же роль) +
    дополнительный признак сессии impersonatedByPlatformAdminId
  → событие PLATFORM_IMPERSONATION_STARTED { companyId, userId, platformAdminId }
  → редирект в обычный интерфейс компании, постоянный баннер "Вы вошли как поддержка LeadFlow — {компания}"
    с кнопкой "Выйти из режима поддержки"

POST /api/platform/impersonate/end
  → завершает impersonation-сессию, возвращает в /platform
  → событие PLATFORM_IMPERSONATION_ENDED
```

### Почему сессия «как реальный User», а не отдельный виртуальный контекст

Весь остальной код (видимость лидов, `assignedToId`, `createdById` и т.п.) ожидает, что `session.user.id` — это существующий `User.id` этой компании. Заводить параллельный «фиктивный» контекст означало бы либо переписывать все проверки видимости специально под impersonation, либо допускать действия без привязки к реальному пользователю компании — хуже для истории лида. Использование реальной записи `User` ничего не ломает в уже написанной логике.

### Аудит

Каждое действие во время impersonation пишется в `events` как обычно (с реальным `userId`), но дополнительно помечено `impersonatedByPlatformAdminId` — отличить «администратор компании сделал сам» от «поддержка сделала от его имени» можно всегда, задним числом.

---

## Критичные транзакции

### Приём лида

Любой источник (вебхук или ручное создание) → нормализация полей → сохранение `Lead` + событие `LEAD_CREATED` в одной транзакции → ответ источнику. Неизвестные поля — в `customFields`, без потерь. Подробности — `.docs/modules/leads-intake.md`.

### Дедуп-проверка

После коммита приёма (вебхук, асинхронно) или до сохранения (ручное создание, синхронно) — поиск совпадений по телефону/email среди лидов компании, создание `DuplicateFlag` на каждое совпадение. Не блокирует и не объединяет. Подробности — `.docs/modules/leads-intake.md`, `.docs/modules/leads.md`.

### Автораспределение

`AssignmentRule` (по источнику/форме, с приоритетом и запасным) → если не сработало — `assignMode` (`MANUAL`/`ROUND_ROBIN`) → если и это не дало результата — событие `ASSIGNMENT_FAILED`. Подробности — `.docs/modules/assignment.md`.

### Закрытие лида

```typescript
await prisma.$transaction(async (tx) => {
  const lead = await tx.lead.findFirstOrThrow({ where: { id: leadId, companyId } });
  if (closeType === "LOST" && !lossReasonId) throw new ValidationError("LOSS_REASON_REQUIRED");

  await tx.lead.update({
    where: { id: leadId },
    data: { closeType, closedAt: new Date(), lossReasonId: closeType === "LOST" ? lossReasonId : null },
  });
  await tx.event.create({
    data: { companyId, leadId, userId, type: closeType === "WON" ? "LEAD_WON" : "LEAD_LOST", payload: closeType === "LOST" ? { lossReasonId } : {} },
  });
});
```

### Создание компании и приглашение

```typescript
await prisma.$transaction(async (tx) => {
  const company = await tx.company.create({ data: { name, settings: DEFAULT_COMPANY_SETTINGS } });
  await tx.pipelineStage.createMany({ data: DEFAULT_STAGES(company.id) });
  await tx.lossReason.createMany({ data: DEFAULT_LOSS_REASONS(company.id) });
  const invite = await tx.companyInvite.create({
    data: { companyId: company.id, email: adminEmail, tokenHash: hashToken(token), expiresAt: addDays(new Date(), 7) },
  });
  await tx.event.create({ data: { companyId: company.id, type: "COMPANY_CREATED" } });
  return { company, invite };
});
```

### Принятие приглашения

```typescript
await prisma.$transaction(async (tx) => {
  const invite = await tx.companyInvite.findUniqueOrThrow({ where: { tokenHash } });
  if (invite.usedAt || invite.expiresAt < new Date()) throw new ValidationError("INVITE_INVALID");

  const user = await tx.user.create({
    data: { companyId: invite.companyId, email: invite.email, passwordHash: await hashPassword(password), name, role: "ADMIN" },
  });
  await tx.companyInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
  return user;
});
```

### Блокировка/разблокировка компании

```typescript
await prisma.company.update({ where: { id: companyId }, data: { isBlocked } });
await writeEvent(companyId, isBlocked ? "COMPANY_BLOCKED" : "COMPANY_UNBLOCKED", { byPlatformAdminId });
```

### Откат импорта

```typescript
await prisma.$transaction(async (tx) => {
  const batch = await tx.importBatch.findFirstOrThrow({ where: { id: batchId, companyId, status: "DONE" } });
  await tx.lead.deleteMany({ where: { importBatchId: batchId, companyId } });
  await tx.importBatch.update({ where: { id: batchId }, data: { status: "ROLLED_BACK" } });
  await tx.event.create({ data: { companyId, userId, type: "IMPORT_ROLLED_BACK", payload: { batchId, deleted: batch.imported } } });
});
```

Подробности оставшихся транзакций (срабатывание напоминания, удаление этапа с переносом лидов, смена этапа) — в соответствующих модулях (`.docs/modules/reminders.md`, `.docs/modules/pipeline.md`); сами транзакции не зависели ни от тарифов, ни от ролей и не изменились в этой версии.

---

## Индексы

```prisma
@@index([companyId])              // практически на каждой модели
@@index([stageId])                // Lead
@@index([assignedToId])           // Lead, Task
@@index([name]) / [phone] / [email]  // Lead — поиск
@@index([createdAt])              // Lead, Event
@@index([closeType])              // Lead — открытые/закрытые для отчётов и "Сегодня"
@@index([leadId])                 // Comment, Event, Reminder, Task, DuplicateFlag
@@index([matchedLeadId])          // DuplicateFlag
@@index([type])                   // Event
@@index([role])                   // User
@@index([order])                  // PipelineStage
@@index([status, remindAt])       // Reminder
@@index([status]) / [dueDate]     // Task
@@index([priority])               // AssignmentRule
@@index([lastUsedAt])             // IntegrationSource
@@index([impersonatedByPlatformAdminId])  // Event
@@unique([companyId, type, label]) // IntegrationSource — composite-ключ для upsert
@@index([nextPaymentAt])           // Company — выборка приближающихся продлений для дайджеста
```

---

## Миграции

Миграции коммитятся в репозиторий, `prisma migrate deploy` — в проде, не `db push`. Изменения JSONB-структур (`settings`, `utm`, `marketing`, `customFields`, `notificationPreferences`) не требуют миграции схемы — гибкость заложена изначально.

Переход с v3.0 (биллинг/тарифы/WhatsApp) на v4.0 — не апгрейд существующей инсталляции, а замена схемы для новой версии продукта. `Plan`, `SubscriptionStatus`, `BillingCycle`, `Payment`, `PaymentMethod` выпиливаются, а не мигрируются — действующих компаний с тарифами и оплатой, которые нужно было бы переносить, не существует.