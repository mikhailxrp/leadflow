# Модуль: Напоминания (reminders)

> Спецификация создания, управления и доставки напоминаний по лидам. Пользователь устанавливает дату, время и каналы доставки — в срок напоминание уходит в Telegram и/или Email.
> Связанные файлы: `.docs/database.md` (модели `Reminder`, `ReminderStatus`, транзакция №5), `.docs/modules/notifications.md` (Telegram-доставка, `lib/telegram.ts`), `.docs/modules/leads.md` (карточка лида, где отображаются напоминания).

---

## Содержание

1. [Цели модуля](#цели-модуля)
2. [Архитектурные решения](#архитектурные-решения)
3. [Создание напоминания](#создание-напоминания)
4. [Редактирование и отмена](#редактирование-и-отмена)
5. [Планировщик (scheduler)](#планировщик-scheduler)
6. [Каналы доставки](#каналы-доставки)
7. [Отображение в карточке лида](#отображение-в-карточке-лида)
8. [API-эндпоинты](#api-эндпоинты)
9. [Файлы, которые создаются](#файлы-которые-создаются)
10. [Серверные правила безопасности](#серверные-правила-безопасности)
11. [Связи с другими модулями](#связи-с-другими-модулями)

---

## Цели модуля

После завершения этого модуля:

- Пользователь ставит напоминание на лид: дата, время, текст, каналы (Telegram и/или Email)
- В указанное время напоминание доставляется по выбранным каналам
- Сбой одного канала не отменяет доставку по другому
- В карточке лида видны активные и исполненные напоминания
- Пользователь может изменить или отменить напоминание до срабатывания
- Архитектура каналов расширяема без изменения схемы БД

**Не входит в модуль:**

- Привязка Telegram-аккаунта → `.docs/modules/notifications.md`
- Настройка SMTP → ENV-переменные, вне UI
- SMS, push и другие будущие каналы → добавляются как handler в `lib/reminders/channels/` (FR-76)

---

## Архитектурные решения

### 1. Каналы в JSONB, не в enum и не в отдельной таблице

```
channels: ["telegram", "email"]   // сейчас
channels: ["telegram", "sms"]     // завтра — без миграции
```

Поле `Reminder.channels` — JSONB-массив строк. Добавить новый канал = создать файл `lib/reminders/channels/<name>.ts` и передать его имя при создании напоминания. Схема не меняется (FR-76).

### 2. Статус FIRED до реальной доставки

```
транзакция: PENDING → FIRED + событие REMINDER_FIRED
  ПОСЛЕ: доставка (Promise.allSettled)
    ошибка канала → событие REMINDER_FAILED в events (аудит)
```

Почему так: статус меняется **до** доставки. Сбой Telegram-API или SMTP не откатывает `FIRED` — напоминание не сработает повторно. Это осознанный выбор: лучше потерять одно уведомление, чем задолбить пользователя дублями при проблемах со сторонними сервисами. Ошибки доставки видны в журнале событий.

### 3. Guard против двойного срабатывания

```typescript
// idempotent guard — updateMany вернёт count=0 если статус уже не PENDING
const updated = await tx.reminder.updateMany({
  where: { id: reminder.id, status: "PENDING" },
  data: { status: "FIRED", firedAt: new Date() },
});
if (updated.count === 0) return; // уже обработано
```

PM2 может рестартовать в момент работы cron. Без guard — два процесса подхватят одно напоминание и пользователь получит дубль. PostgreSQL гарантирует атомарность `updateMany` — только один процесс получит `count = 1`.

### 4. Cron в том же процессе Next.js

`node-cron` запускается при старте приложения (`lib/reminders/scheduler.ts`). Для MVP с одной инсталляцией и PM2 этого достаточно. Точность ±1 минута — приемлемо для напоминаний. При горизонтальном масштабировании (несколько инстансов) — заменить на Bull/BullMQ с Redis. Guard против дублей защищает и в этом случае.

### 5. Напоминание привязано к лиду, а не к пользователю

Напоминание создаётся на лид, `createdBy` — кто создал (для отображения). При удалении лида напоминание каскадно удаляется и никогда не сработает. При удалении/блокировке пользователя его напоминания остаются и продолжают срабатывать — доставка по `channels` (email/telegram) от этого не зависит.

---

## Создание напоминания

### Поведение (FR-70, FR-72)

В карточке лида — кнопка «Добавить напоминание» → модалка:

- Поле текста напоминания
- Дейтпикер с временем (`remindAt`) — минимальное значение: текущее время + 5 минут
- Чекбоксы каналов: **Telegram** / **Email** (минимум один обязателен)
- Кнопка «Сохранить»

```
POST /api/leads/:id/reminders
  → валидация: remindAt в будущем, channels непустой массив, хотя бы один канал
  → prisma.reminder.create(...)
  → writeEvent(REMINDER_CREATED)
  → Response 200: созданное напоминание
```

### Валидация

```typescript
// lib/validations/reminders.ts
const createReminderSchema = z.object({
  text: z.string().min(1).max(1000),
  remindAt: z.string().datetime().refine(
    (v) => new Date(v) > new Date(Date.now() + 5 * 60 * 1000),
    "Дата должна быть в будущем (минимум 5 минут)"
  ),
  channels: z.array(z.enum(["telegram", "email"])).min(1, "Выберите хотя бы один канал"),
});
```

### Предупреждения при создании

```
Если → выбран Telegram, но createdBy.telegramChatId = null
То   → предупреждение в UI: «Telegram не привязан. Напоминание придёт только на Email»
       → напоминание всё равно создаётся (не блокируем)

Если → выбран Email, но createdBy.email пустой (невозможно в нашей системе)
То   → убрать Email из доступных каналов
```

---

## Редактирование и отмена

### Редактирование (FR-74)

`PATCH /api/leads/:id/reminders/:rid` — можно изменить `text`, `remindAt`, `channels`.

```
Если → status === PENDING
То   → update разрешён

Если → status === FIRED или CANCELLED
То   → 400 REMINDER_NOT_EDITABLE
```

### Отмена (FR-74)

`DELETE /api/leads/:id/reminders/:rid` — не физическое удаление, а `status = CANCELLED`.

```typescript
await prisma.reminder.update({
  where: { id: rid, companyId, status: "PENDING" }, // guard: только PENDING
  data: { status: "CANCELLED" },
});
await writeEvent(companyId, "REMINDER_CANCELLED", { reminderId: rid });
```

Отменённые напоминания остаются в БД и видны в истории карточки лида (свёрнутый список).

---

## Планировщик (scheduler)

### Запуск

`lib/reminders/scheduler.ts` инициализируется при старте приложения. Регистрируется в `app/layout.tsx` (server-side) или в точке входа Next.js через `instrumentation.ts`.

```typescript
// lib/reminders/scheduler.ts
import cron from "node-cron";
import { processReminders } from "./processReminders";

export function startReminderScheduler() {
  cron.schedule("* * * * *", async () => {
    await processReminders();
  });
}
```

### Логика processReminders

Полный код транзакции — `.docs/database.md` → «Критичные транзакции → 5. Срабатывание напоминания». Кратко:

```
1. Выбрать все PENDING с remindAt <= now()
2. Для каждого:
   а. updateMany status→FIRED (idempotent guard)
   б. writeEvent REMINDER_FIRED
   в. ПОСЛЕ транзакции: deliverChannels (Promise.allSettled)
   г. Ошибки каналов → writeEvent REMINDER_FAILED
```

### Что значит «ПОСЛЕ транзакции»

Доставка в Telegram/Email — вызов внешних API. Они могут висеть секунды. Держать транзакцию открытой всё это время = блокировать строки в БД. Поэтому: транзакция быстро фиксирует статус → коммит → потом отправляем.

---

## Каналы доставки

Каждый канал — отдельный файл в `lib/reminders/channels/`. Единый интерфейс:

```typescript
// lib/reminders/channels/types.ts
export interface ReminderChannel {
  deliver(reminder: ReminderWithUser): Promise<void>;
}
```

### Telegram

```typescript
// lib/reminders/channels/telegram.ts
export async function deliver(reminder: ReminderWithUser): Promise<void> {
  const chatId = reminder.createdBy.telegramChatId;
  if (!chatId) throw new Error("Telegram не привязан");

  await sendTelegram(chatId, buildReminderMessage(reminder));
}

function buildReminderMessage(r: ReminderWithUser): string {
  return [
    `🔔 Напоминание по лиду`,
    `Лид: ${r.lead.name ?? r.lead.phone ?? r.lead.email ?? "—"}`,
    ``,
    r.text,
  ].join("\n");
}
```

**Использует** `lib/telegram.ts` (уже есть, из модуля notifications).

### Email

```typescript
// lib/reminders/channels/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function deliver(reminder: ReminderWithUser): Promise<void> {
  const to = reminder.createdBy.email;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `🔔 Напоминание: ${reminder.lead.name ?? "лид"}`,
    text: reminder.text,
  });
}
```

**ENV:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (см. `CLAUDE.md` → ENV).

### Реестр каналов

```typescript
// lib/reminders/channels/index.ts
import { deliver as telegram } from "./telegram";
import { deliver as email } from "./email";

const channels: Record<string, (r: ReminderWithUser) => Promise<void>> = {
  telegram,
  email,
};

export async function deliverChannels(reminder: ReminderWithUser): Promise<PromiseSettledResult<void>[]> {
  const handlers = (reminder.channels as string[])
    .map((ch) => channels[ch])
    .filter(Boolean);

  return Promise.allSettled(handlers.map((fn) => fn(reminder)));
}
```

**Добавить новый канал (FR-76):** создать `lib/reminders/channels/sms.ts` с функцией `deliver`, зарегистрировать в `index.ts`. Схема БД не меняется — пользователь просто передаёт `"sms"` в массиве `channels`.

---

## Отображение в карточке лида

### Блок «Напоминания» (FR-73)

Вставляется в правую колонку карточки лида (`components/reminders/ReminderBlock.tsx`), под блоком «Работа с лидом».

**Активные (`PENDING`):**

```
┌─────────────────────────────────────────┐
│ 🔔 Напоминания                  [+ Добавить] │
│                                         │
│ 15 июня, 14:00                         │
│ Перезвонить — обсудить КП              │
│ [Telegram] [Email]        [Изменить] [Отменить] │
│                                         │
│ 20 июня, 09:00                         │
│ Уточнить решение по договору           │
│ [Email]               [Изменить] [Отменить] │
└─────────────────────────────────────────┘
```

**Исполненные и отменённые (FR-75)** — свёрнутый блок «История напоминаний» под активными. Раскрывается по клику. Показывает `fired_at` или дату отмены.

### Источник данных

`GET /api/leads/:id/reminders` возвращает все напоминания лида, отсортированные по `remindAt asc`. Клиент разделяет их на `pending` и `fired/cancelled`.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/leads/:id/reminders` | Список напоминаний по лиду | Session | Видимость по роли |
| POST | `/api/leads/:id/reminders` | Создать напоминание | Session | ADMIN / MANAGER |
| PATCH | `/api/leads/:id/reminders/:rid` | Изменить (только PENDING) | Session | Автор или ADMIN |
| DELETE | `/api/leads/:id/reminders/:rid` | Отменить (status→CANCELLED) | Session | Автор или ADMIN |

> Права на редактирование/отмену: автор напоминания или ADMIN. Менеджер не может отменить чужое напоминание.

### `POST /api/leads/:id/reminders`

**Request:**

```json
{
  "text": "Перезвонить — обсудить КП",
  "remindAt": "2026-06-15T11:00:00Z",
  "channels": ["telegram", "email"]
}
```

**Response 200:**

```json
{
  "id": "clxxx",
  "text": "Перезвонить — обсудить КП",
  "remindAt": "2026-06-15T11:00:00Z",
  "channels": ["telegram", "email"],
  "status": "PENDING",
  "createdBy": { "id": "...", "name": "Алексей" },
  "createdAt": "2026-06-11T08:00:00Z"
}
```

**Response 400:**

```json
{ "success": false, "error": "VALIDATION_ERROR", "details": "Дата должна быть в будущем" }
```

### `DELETE /api/leads/:id/reminders/:rid`

**Response 200:** `{ "success": true, "status": "CANCELLED" }`
**Response 400:** `{ "success": false, "error": "REMINDER_NOT_EDITABLE" }` (уже FIRED)
**Response 403:** `{ "success": false, "error": "FORBIDDEN" }` (чужое напоминание)

---

## Файлы, которые создаются

```
app/
└── api/
    └── leads/
        └── [id]/
            └── reminders/
                ├── route.ts              # GET (список), POST (создать)
                └── [rid]/route.ts        # PATCH (изменить), DELETE (отменить)

lib/
└── reminders/
    ├── scheduler.ts                      # Запуск cron (startReminderScheduler)
    ├── processReminders.ts               # Логика срабатывания: выборка → транзакция → доставка
    └── channels/
        ├── types.ts                      # Интерфейс ReminderChannel
        ├── index.ts                      # Реестр каналов + deliverChannels()
        ├── telegram.ts                   # Доставка в Telegram (через lib/telegram.ts)
        └── email.ts                      # Доставка на Email (nodemailer)

components/
└── reminders/
    ├── ReminderBlock.tsx                 # Client: блок напоминаний в карточке лида
    ├── ReminderItem.tsx                  # Client: строка активного напоминания
    ├── ReminderHistory.tsx               # Client: свёрнутая история (FIRED/CANCELLED)
    └── AddReminderModal.tsx              # Client: модалка создания/редактирования

lib/validations/
└── reminders.ts                          # Zod: createReminderSchema, updateReminderSchema
```

> `startReminderScheduler()` вызывается из `instrumentation.ts` (Next.js 16 — стандартная точка инициализации серверных процессов при старте).

---

## Серверные правила безопасности

1. **`companyId` из сессии, не из запроса.** Лид проверяется по `companyId` текущего пользователя. Нельзя создать напоминание на лид чужой компании.

2. **Видимость напоминаний через видимость лида.** Применяется `visibilityWhere` из `.docs/modules/leads.md` — менеджер в режиме `OWN` не видит напоминания на чужом лиде, потому что не видит сам лид.

3. **Редактирование и отмена — только автор или ADMIN.** Менеджер не может отменить напоминание коллеги.

4. **`remindAt` только в будущем.** Валидация при создании и редактировании. Нельзя поставить напоминание в прошлом — оно бы немедленно сработало при следующем cron-запуске.

5. **Guard против двойного срабатывания.** `updateMany` с условием `status: PENDING` — атомарная операция PostgreSQL. При параллельных запусках планировщика только один обработает напоминание.

6. **Email и Telegram недоступны без конфига.** `email.ts` проверяет наличие ENV-переменных SMTP. `telegram.ts` проверяет наличие `telegramChatId`. При отсутствии — ошибка канала логируется в `events`, не паникует.

7. **Ошибки доставки не откатывают статус.** `FIRED` фиксируется в БД до вызова внешних API. Это защита от повторной отправки при временной недоступности Telegram/SMTP.

8. **Каскадное удаление с лидом.** При удалении лида (`onDelete: Cascade`) все его напоминания удаляются — планировщик их больше не подхватит.

---

## Связи с другими модулями

- **`.docs/modules/leads.md`** — карточка лида содержит блок напоминаний; `visibilityWhere` применяется к лиду прежде чем выдать его напоминания.
- **`.docs/modules/notifications.md`** — `lib/telegram.ts` используется каналом `telegram.ts`; привязка `telegramChatId` — там же.
- **`.docs/database.md`** — модель `Reminder`, `ReminderStatus`, транзакция №5 (срабатывание планировщика), составной индекс `[status, remindAt]`.
- **`CLAUDE.md`** — ENV-переменные SMTP, `lib/reminders/` в дереве папок, правило про расширяемость каналов в AI Rules.
