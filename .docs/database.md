# Database Schema

> Источник правды по схеме БД проекта. Все Prisma-модели, enum'ы, связи, сидеры и критичные транзакции — здесь.
> При расхождениях между этим файлом и любым модулем `.docs/modules/*` — верно то, что в этом файле.

---

## Содержание

1. [Принцип мультитенантности](#принцип-мультитенантности)
2. [Enums](#enums)
3. [Модели — компания и пользователи](#модели--компания-и-пользователи)
4. [Модели — лиды и воронка](#модели--лиды-и-воронка)
5. [Модели — журнал событий](#модели--журнал-событий)
6. [Модели — интеграции](#модели--интеграции)
7. [Схема связей](#схема-связей)
8. [Сидеры](#сидеры)
9. [Критичные транзакции](#критичные-транзакции)
10. [Индексы](#индексы)
11. [Миграции](#миграции)

---

## Принцип мультитенантности

**Каждая прикладная таблица содержит `companyId`.** Это закладка на будущий SaaS, действующая с первого дня. Сейчас компания одна (создаётся сидером), но схема и код пишутся так, будто компаний много.

**Жёсткое правило:** любой запрос к данным фильтруется по `companyId` из сессии. Запрос лидов/пользователей/этапов без `where: { companyId }` — это будущая утечка данных между тенантами и считается багом.

`companyId` индексируется во всех таблицах, где он есть.

---

## Enums

Все enum'ы вынесены отдельной секцией. Используются в нескольких моделях.

```prisma
enum UserRole {
  ADMIN     // полный доступ: пользователи, интеграции, воронка, настройки
  MANAGER   // операционная роль: работа с лидами
}

enum LeadSource {
  TILDA
  WORDPRESS
  YANDEX
  API        // универсальный webhook / сторонняя форма
  OTHER
  MANUAL     // создан вручную в CRM
}

enum AssignMode {
  MANUAL       // админ назначает ответственного вручную
  ROUND_ROBIN  // автораспределение по кругу между активными менеджерами
}

enum LeadVisibility {
  ALL   // менеджер видит все лиды
  OWN   // менеджер видит только свои
}

enum EventType {
  LEAD_CREATED      // создан лид (любой источник)
  STAGE_CHANGED     // смена этапа воронки
  ASSIGNED          // назначен/переназначен менеджер
  COMMENTED         // добавлен комментарий
  LEAD_UPDATED      // изменены контактные данные
  LEAD_DELETED      // удалён лид
  USER_CREATED      // создан менеджер
  USER_BLOCKED      // менеджер заблокирован
  USER_UNBLOCKED    // менеджер разблокирован
  LOGIN             // вход пользователя
  REMINDER_CREATED  // создано напоминание
  REMINDER_FIRED    // напоминание сработало (доставка выполнена)
  REMINDER_FAILED   // ошибка доставки по одному из каналов
  REMINDER_CANCELLED // напоминание отменено пользователем
}

enum ReminderStatus {
  PENDING    // ожидает срабатывания
  FIRED      // сработало (доставка выполнена или предпринята попытка)
  CANCELLED  // отменено пользователем до срабатывания
}
```

---

## Модели — компания и пользователи

### `Company` — компания (тенант)

```prisma
model Company {
  id          String   @id @default(cuid())
  name        String
  licenseKey  String                          // лицензионный ключ (см. CLAUDE.md → лицензирование)
  settings    Json     @default("{}")         // CompanySettings (см. ниже)
  createdAt   DateTime @default(now())

  users       User[]
  leads       Lead[]
  stages      PipelineStage[]
  apiKeys     ApiKey[]
  events      Event[]
}
```

**Назначение:** Корневая таблица тенантов. Сейчас одна запись (создаётся сидером).

**Структура `settings` (JSONB):**

```typescript
type CompanySettings = {
  assignMode: "MANUAL" | "ROUND_ROBIN";      // режим распределения лидов (FR-32)
  leadVisibility: "ALL" | "OWN";             // видимость лидов менеджерами (настройка админа)
  roundRobinCursor: string | null;           // id последнего менеджера, получившего лид (для round-robin)
  telegramEnabled: boolean;                  // включены ли Telegram-уведомления
};
```

**Почему `settings` в JSONB, а не колонками:** настройки компании меняются и расширяются по ходу развития продукта. JSONB позволяет добавлять поля без миграции. Это не данные для поиска/фильтрации — читаются всегда целиком по `companyId`.

---

### `User` — пользователи (админ и менеджеры)

```prisma
model User {
  id              String    @id @default(cuid())
  companyId       String
  email           String    @unique
  passwordHash    String    // bcrypt-хэш
  name            String
  role            UserRole  @default(MANAGER)
  isBlocked       Boolean   @default(false)
  telegramChatId  String?   // для Telegram-уведомлений (FR-63)
  createdAt       DateTime  @default(now())

  company         Company   @relation(fields: [companyId], references: [id])
  assignedLeads   Lead[]    @relation("AssignedManager")
  comments        Comment[]

  @@index([companyId])
  @@index([role])
}
```

**Назначение:** Все пользователи системы. Роль различается полем `role` (не отдельными таблицами — в отличие от Boxed-проекта без SaaS-задела админ и менеджер живут в одной компании и одной таблице).

**Ключевые особенности:**

- `passwordHash` хранит ТОЛЬКО bcrypt-хэш. Plain пароль задаётся при создании менеджера админом.
- Первый администратор создаётся сидером из ENV.
- `isBlocked` — мягкая блокировка вместо удаления. Заблокированный менеджер не может войти, но история его действий и комментарии сохраняются.
- `telegramChatId` заполняется когда менеджер привязывает Telegram-аккаунт в профиле. `null` = уведомления только в интерфейсе.

**Защиты в API:**

- Запрет блокировки/удаления самого себя
- Запрет удаления последнего администратора
- Менеджеров создаёт только ADMIN

---

## Модели — лиды и воронка

### `Lead` — лиды

```prisma
model Lead {
  id            String        @id @default(cuid())
  companyId     String
  name          String?       // индексируется для поиска
  phone         String?       // индексируется для поиска
  email         String?       // индексируется для поиска
  comment       String?       // комментарий из формы
  source        LeadSource
  stageId       String
  assignedToId  String?       // ответственный менеджер
  utm           Json          @default("{}")   // UTM-метки
  marketing     Json          @default("{}")   // реферер, landing, кампания, данные Директа
  customFields  Json          @default("{}")   // все нестандартные поля формы
  createdAt     DateTime      @default(now())

  company       Company       @relation(fields: [companyId], references: [id])
  stage         PipelineStage @relation(fields: [stageId], references: [id])
  assignedTo    User?         @relation("AssignedManager", fields: [assignedToId], references: [id])
  comments      Comment[]
  events        Event[]

  @@index([companyId])
  @@index([stageId])
  @@index([assignedToId])
  @@index([name])
  @@index([phone])
  @@index([email])
  @@index([createdAt])
}
```

**Назначение:** Центральная сущность системы. Каждая заявка из любого источника — отдельный лид.

**Ключевые особенности:**

- **Фиксированные поля (`name`, `phone`, `email`) — отдельные индексируемые колонки** для быстрого поиска (FR-40). Все они `nullable`: форма может не прислать какое-то из них.
- **Гибкие поля — три JSONB-колонки:**
  - `utm` — пять UTM-меток (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`)
  - `marketing` — реферер, landing page, источник трафика, данные Яндекс Директа (campaign, adGroup, keyword, device, region)
  - `customFields` — всё, что прислала форма сверх известных полей (FR-05). Сюда падают любые неизвестные поля без потерь.
- **Лид нельзя потерять:** приём не падает из-за неожиданной структуры. Неизвестное → `customFields`, отсутствующее фиксированное → `null` (FR-08).
- **Дедупликация не выполняется:** две заявки от одного человека = два лида (FR-06).
- `source` определяется по параметру `source` запроса или по привязке API-ключа (FR-07).

---

### `PipelineStage` — этапы воронки

```prisma
model PipelineStage {
  id         String   @id @default(cuid())
  companyId  String
  name       String
  color      String   // hex, например "#3B82F6"
  order      Int      // порядок в воронке (0, 1, 2, ...)
  createdAt  DateTime @default(now())

  company    Company  @relation(fields: [companyId], references: [id])
  leads      Lead[]

  @@index([companyId])
  @@index([order])
}
```

**Назначение:** Этапы Kanban-воронки. Полностью настраиваемые админом (FR-22), не хардкод.

**Ключевые особенности:**

- 5 дефолтных этапов создаются сидером при создании компании (FR-23): Новый лид → Первичный контакт → В работе → Тёплый клиент → Сделка.
- `order` определяет позицию колонки. Переупорядочивание = пересчёт `order`.
- **Удаление этапа с лидами** требует переноса лидов в другой этап (FR-25) — атомарная транзакция (см. ниже).
- Каждый этап принадлежит компании: `@@index([companyId])`.

---

### `Comment` — комментарии менеджеров

```prisma
model Comment {
  id         String   @id @default(cuid())
  leadId     String
  userId     String
  text       String
  createdAt  DateTime @default(now())

  lead       Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id])

  @@index([leadId])
}
```

**Назначение:** Лента комментариев в карточке лида (FR-14).

**Ключевые особенности:**

- Каскадное удаление с лидом: удалили лид → удалились его комментарии.
- `userId` без каскада: удаление менеджера не должно стирать историю обсуждения лида. (При удалении менеджера в API проверяется политика; обычно менеджеры блокируются, а не удаляются.)
- Привязка к `companyId` — косвенная, через `Lead`. Запросы комментариев всегда идут от конкретного лида, уже отфильтрованного по компании.

---

## Модели — журнал событий

### `Event` — журнал событий (Event Sourcing)

```prisma
model Event {
  id         String     @id @default(cuid())
  companyId  String
  leadId     String?    // связанный лид (если событие про лид)
  userId     String?    // кто инициировал (null = система, напр. webhook)
  type       EventType
  payload    Json       @default("{}")   // детали: старое/новое значение и т.п.
  createdAt  DateTime   @default(now())

  company    Company    @relation(fields: [companyId], references: [id])
  lead       Lead?      @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([leadId])
  @@index([type])
  @@index([createdAt])
}
```

**Назначение:** Единая таблица всех событий системы. Два применения:

1. **История изменений лида** (FR-15, FR-26) — выборка событий по `leadId`.
2. **Задел под аналитику** — отдельный модуль строится поверх `events` без переработки ядра (НФТ 8.4).

**Ключевые особенности:**

- **Пишет только сервер** через `lib/events.ts`. У клиента нет API на запись в `events`.
- `payload` хранит детали в зависимости от `type`. Примеры:
  - `STAGE_CHANGED`: `{ fromStageId, toStageId }`
  - `ASSIGNED`: `{ fromUserId, toUserId }`
  - `LEAD_CREATED`: `{ source }`
- `leadId` каскадно удаляется с лидом; `userId` — опционален и без FK-каскада (событие переживает удаление пользователя).
- Это **append-only** таблица: события не редактируются и не удаляются (кроме каскада по лиду).

---

## Модели — интеграции

### `ApiKey` — ключи для внешних форм

```prisma
model ApiKey {
  id           String   @id @default(cuid())
  companyId    String
  name         String   // для какого сайта/источника
  keyHash      String   // хэш ключа (сам ключ показывается один раз при создании)
  sourceLabel  String   // метка источника — попадёт в Lead.source / customFields
  createdAt    DateTime @default(now())

  company      Company  @relation(fields: [companyId], references: [id])

  @@index([companyId])
}
```

**Назначение:** API-ключи для приёма лидов с произвольных сайтов через универсальный webhook (FR-02, FR-03).

**Ключевые особенности:**

- **`keyHash`, не сам ключ.** Plain-ключ генерируется при создании, показывается админу один раз, в БД хранится только хэш (как пароль). Потерян — создаётся новый.
- При входящем webhook сервер хэширует переданный ключ и ищет совпадение `keyHash` в пределах компании.
- `sourceLabel` определяет, какой источник записать лиду.
- Tilda и WordPress используют отдельные webhook-эндпоинты и могут не требовать `ApiKey` (опционально — по решению модуля интеграций).

---

## Модели — напоминания

### `Reminder` — напоминания по лидам

```prisma
model Reminder {
  id          String         @id @default(cuid())
  companyId   String
  leadId      String
  createdById String
  text        String
  remindAt    DateTime
  channels    Json           @default("[]")  // массив: ["telegram", "email"]
  status      ReminderStatus @default(PENDING)
  firedAt     DateTime?      // когда фактически сработало (null пока pending/cancelled)
  createdAt   DateTime       @default(now())

  company     Company        @relation(fields: [companyId], references: [id])
  lead        Lead           @relation(fields: [leadId], references: [id], onDelete: Cascade)
  createdBy   User           @relation(fields: [createdById], references: [id])

  @@index([companyId])
  @@index([leadId])
  @@index([status, remindAt])  // планировщик: WHERE status=PENDING AND remindAt <= now()
}
```

**Назначение:** Напоминания пользователей по конкретным лидам (FR-70…FR-76). В указанное время доставляются по выбранным каналам.

**Ключевые особенности:**

- **`channels` — JSONB-массив** (а не enum-поле или отдельная таблица). Позволяет добавлять новые каналы доставки (SMS, push и др.) без миграции схемы — только новый обработчик в `lib/reminders/channels/` (FR-76).
- **`status = FIRED` выставляется после попытки доставки**, независимо от её успеха. Ошибки отдельных каналов логируются событием `REMINDER_FAILED` в `events` (аудит без потери статуса).
- **Каскад с `Lead`:** напоминание удаляется вместе с лидом (`onDelete: Cascade`). Удалили лид — напоминания по нему больше не нужны.
- **`createdBy` без каскада:** удаление/блокировка менеджера не стирает его напоминания — они продолжают срабатывать (доставляются по каналам) и видны в истории лида.
- **Составной индекс `[status, remindAt]`** — ключевой для планировщика: каждую минуту он делает `WHERE status = PENDING AND remindAt <= NOW()`. Без этого индекса при росте таблицы cron-джоб будет делать full scan.

---

## Схема связей

```
Company ──< User ──< Comment
   │         │
   │         ├──< Lead (assignedTo, nullable)
   │         └──< Reminder (createdBy)
   │
   ├──< Lead >── PipelineStage
   │     │
   │     ├──< Comment
   │     ├──< Event
   │     └──< Reminder
   │
   ├──< PipelineStage
   ├──< ApiKey
   ├──< Reminder
   └──< Event

Lead ──< Event    (история изменений конкретного лида)
Lead ──< Comment  (лента комментариев)
Lead ──< Reminder (напоминания по лиду)
```

**Принципы:**

- **Всё привязано к `Company`.** Корневая изоляция тенантов. Каждый прикладной запрос фильтруется по `companyId`.
- **Каскад с `Lead`:** `Comment`, `Event` и `Reminder` удаляются вместе с лидом.
- **`Event` и `Reminder` переживают удаление пользователя:** `userId`/`createdById` опциональны или без FK-каскада — журнал и напоминания не теряют историю.
- **`User.role`** различает админа и менеджера в одной таблице (SaaS-задел: и админ, и менеджеры принадлежат одной компании).
- **`PipelineStage` — контент компании**, не глобальный: у каждой компании своя воронка.

---

## Сидеры

При первом деплое скрипт `prisma/seed.ts` создаёт минимально необходимый каркас. **Сидер идемпотентен** — защита через `if (await prisma.company.count() === 0)`. При повторных деплоях не пересоздаёт данные (INIT-04).

### 1. `Company` — компания (тенант)

Создаётся из ENV:

- `COMPANY_INITIAL_NAME` — название
- `LICENSE_KEY` — записывается в `licenseKey`
- `settings` — дефолты: `{ assignMode: "MANUAL", leadVisibility: "ALL", roundRobinCursor: null, telegramEnabled: false }`

### 2. `User` — первый администратор

Создаётся из ENV (INIT-02):

- `ADMIN_INITIAL_EMAIL`
- `ADMIN_INITIAL_PASSWORD` (хэшируется bcrypt при INSERT)
- `role = ADMIN`, привязка к созданной компании

После создания первого админа ENV-переменные `ADMIN_INITIAL_*` удаляются с сервера. Дальнейшие менеджеры — через UI админки.

### 3. `PipelineStage` — 5 дефолтных этапов

Создаются для компании (INIT-03, FR-23):

| `name` | `color` | `order` |
| --- | --- | --- |
| Новый лид | `#3B82F6` | 0 |
| Первичный контакт | `#8B5CF6` | 1 |
| В работе | `#F59E0B` | 2 |
| Тёплый клиент | `#10B981` | 3 |
| Сделка | `#22C55E` | 4 |

---

## Критичные транзакции

### 1. Приём лида

Атомарная операция: создать лид + записать событие + (опционально) назначить менеджера. Приём не должен падать из-за неизвестных полей.

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Создать лид. Неизвестные поля уже разложены парсером:
  //    фиксированные → колонки, остальное → customFields/utm/marketing.
  const lead = await tx.lead.create({
    data: {
      companyId,
      name, phone, email, comment,
      source,
      stageId: defaultStageId,        // первый этап воронки (order=0)
      utm, marketing, customFields,
    },
  });

  // 2. Записать событие создания
  await tx.event.create({
    data: { companyId, leadId: lead.id, userId: null, type: "LEAD_CREATED", payload: { source } },
  });

  return lead;
});

// 3. ПОСЛЕ транзакции (не блокируя приём):
//    - назначить менеджера (см. транзакцию 2, если режим ROUND_ROBIN)
//    - отправить SSE-уведомление и Telegram (lib/sse.ts, lib/telegram.ts)
```

**Почему назначение и уведомления — после транзакции:** приём лида (запись в БД) критичен и должен завершиться быстро. Назначение и доставка уведомлений — отдельные шаги; их сбой не должен откатывать сохранённый лид.

---

### 2. Автораспределение (round-robin)

Назначить лид следующему активному менеджеру по кругу. Защита от гонок при одновременном приёме нескольких лидов.

```typescript
await prisma.$transaction(async (tx) => {
  // Advisory lock на компанию — параллельные распределения идут последовательно,
  // чтобы курсор round-robin не перескакивал.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}))`;

  // Активные менеджеры компании, по порядку
  const managers = await tx.user.findMany({
    where: { companyId, role: "MANAGER", isBlocked: false },
    orderBy: { createdAt: "asc" },
  });
  if (managers.length === 0) return; // некому назначать — лид остаётся без ответственного

  // Найти следующего после курсора
  const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
  const settings = company.settings as CompanySettings;
  const lastIndex = managers.findIndex((m) => m.id === settings.roundRobinCursor);
  const next = managers[(lastIndex + 1) % managers.length];

  // Назначить + событие + сдвинуть курсор
  await tx.lead.update({ where: { id: leadId }, data: { assignedToId: next.id } });
  await tx.event.create({
    data: { companyId, leadId, userId: null, type: "ASSIGNED", payload: { toUserId: next.id } },
  });
  await tx.company.update({
    where: { id: companyId },
    data: { settings: { ...settings, roundRobinCursor: next.id } },
  });
});
```

**Почему advisory lock:** без него два одновременно пришедших лида прочитают один и тот же `roundRobinCursor` и оба уйдут одному менеджеру. Lock сериализует распределение в пределах компании.

---

### 3. Удаление этапа воронки с переносом лидов

Удалить этап нельзя, пока в нём есть лиды — их нужно перенести (FR-25). Одна транзакция.

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Перенести все лиды удаляемого этапа в целевой
  const moved = await tx.lead.updateMany({
    where: { companyId, stageId: stageToDelete },
    data: { stageId: targetStage },
  });

  // 2. Событие на каждый перенос (или одно агрегированное — по решению модуля)
  await tx.event.create({
    data: {
      companyId, userId: adminId, type: "STAGE_CHANGED",
      payload: { fromStageId: stageToDelete, toStageId: targetStage, bulk: moved.count },
    },
  });

  // 3. Удалить пустой этап
  await tx.pipelineStage.delete({ where: { id: stageToDelete } });
});
```

---

### 4. Смена этапа (drag-and-drop в Kanban)

Переместить карточку лида в другой этап + зафиксировать дату и событие (FR-24).

```typescript
await prisma.$transaction(async (tx) => {
  const lead = await tx.lead.findFirstOrThrow({ where: { id: leadId, companyId } });

  await tx.lead.update({ where: { id: leadId }, data: { stageId: newStageId } });

  await tx.event.create({
    data: {
      companyId, leadId, userId,
      type: "STAGE_CHANGED",
      payload: { fromStageId: lead.stageId, toStageId: newStageId },
    },
  });
});
```

Дата смены статуса = `createdAt` события `STAGE_CHANGED`. Отдельное поле в `Lead` не нужно — история берётся из `events`.

---

### 5. Срабатывание напоминания (планировщик)

Cron-джоб запускается каждую минуту. Для каждого `PENDING`-напоминания с истёкшим `remindAt` — попытка доставки по каналам + смена статуса. Всё в транзакции на уровне одного напоминания.

```typescript
// Выборка за пределами транзакции — быстрый read
const due = await prisma.reminder.findMany({
  where: { status: "PENDING", remindAt: { lte: new Date() } },
  include: { lead: true, createdBy: true },
});

for (const reminder of due) {
  await prisma.$transaction(async (tx) => {
    // 1. Пометить как FIRED сразу — защита от двойного срабатывания
    //    при параллельном запуске (если PM2 рестартует в момент cron)
    const updated = await tx.reminder.updateMany({
      where: { id: reminder.id, status: "PENDING" }, // idempotent guard
      data: { status: "FIRED", firedAt: new Date() },
    });
    if (updated.count === 0) return; // уже обработано другим процессом

    // 2. Событие в журнал
    await tx.event.create({
      data: {
        companyId: reminder.companyId,
        leadId: reminder.leadId,
        userId: null,           // инициатор — система
        type: "REMINDER_FIRED",
        payload: { reminderId: reminder.id, channels: reminder.channels },
      },
    });
  });

  // 3. ПОСЛЕ транзакции — доставка по каналам (параллельно, не блокирует статус)
  const results = await Promise.allSettled(
    (reminder.channels as string[]).map((ch) => deliverChannel(ch, reminder))
  );

  // 4. Логируем ошибки доставки отдельными событиями (не откатываем FIRED)
  for (const [i, result] of results.entries()) {
    if (result.status === "rejected") {
      await writeEvent(reminder.companyId, "REMINDER_FAILED", {
        reminderId: reminder.id,
        channel: (reminder.channels as string[])[i],
        error: result.reason?.message,
      });
    }
  }
}
```

**Почему `updateMany` с `status: PENDING` как guard:** защита от двойного срабатывания — если PM2 рестартовал в момент cron и два процесса подхватили одно напоминание, только один успешно сделает `updateMany` (PostgreSQL гарантирует атомарность). Второй получит `count = 0` и выйдет.

**Почему доставка ПОСЛЕ транзакции:** статус `FIRED` фиксируется в БД до реальной отправки. Сбой Telegram/Email не откатывает статус — напоминание не сработает повторно. Ошибки доставки уходят в `events` с типом `REMINDER_FAILED` для аудита.

---

## Индексы

Списки лидов фильтруются по `companyId`, `stageId`, `assignedToId`. Поиск — по `name`, `phone`, `email`. История — по `leadId` и `createdAt`. Критичные индексы:

```prisma
@@index([companyId])        // все прикладные таблицы — изоляция тенанта + выборки
@@index([stageId])          // Lead — выборка по этапу (Kanban-колонка)
@@index([assignedToId])     // Lead — фильтр по менеджеру (FR-42)
@@index([name])             // Lead — поиск (FR-40)
@@index([phone])            // Lead — поиск
@@index([email])            // Lead — поиск
@@index([createdAt])        // Lead, Event — сортировка по времени, фильтр по периоду (FR-44)
@@index([leadId])           // Event, Comment, Reminder — история и лента по лиду
@@index([type])             // Event — выборка по типу (для будущей аналитики)
@@index([role])             // User — выборка менеджеров (round-robin, фильтр)
@@index([order])            // PipelineStage — сортировка колонок
@@index([status, remindAt]) // Reminder — КРИТИЧНЫЙ: планировщик WHERE status=PENDING AND remindAt<=now()
```

`@unique` поля (`User.email`) автоматически получают индекс — отдельно не указываем.

> **О составном индексе `[status, remindAt]`:** планировщик выполняется каждую минуту. Без этого индекса при тысячах напоминаний он делает full scan таблицы. Порядок полей важен: `status` первым сужает выборку до `PENDING` (~небольшая доля), `remindAt` — уточняет по времени.

---

## Миграции

Все изменения схемы — через Prisma:

```bash
# Создать миграцию (dev)
npx prisma migrate dev --name <название_миграции>

# Применить миграции в production (на сервере клиента)
npx prisma migrate deploy

# Сгенерировать Prisma Client после изменений
npx prisma generate

# Запустить сидер (только первый деплой)
npx prisma db seed

# Открыть Prisma Studio для просмотра данных
npx prisma studio
```

**Правила:**

- Миграции коммитятся в репозиторий (`prisma/migrations/`)
- В production только `migrate deploy` — никогда `migrate dev`
- Перед добавлением `NOT NULL` колонки к непустой таблице — дефолт или двухшаговая миграция
- Изменение JSONB-структур (`settings`, `customFields`, `utm`, `marketing`) НЕ требует миграции — это гибкие поля по design
