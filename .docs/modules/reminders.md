# Модуль: Напоминания (reminders)

> Спецификация создания, управления и доставки напоминаний по лидам. Пользователь устанавливает дату, время и каналы доставки — в срок напоминание уходит в Telegram и/или Email.
> Связанные файлы: `.docs/database.md` (модели `Reminder`, `ReminderStatus`, транзакция «Срабатывание напоминания»), `.docs/modules/notifications.md` (Telegram-доставка, `lib/telegram.ts`), `.docs/modules/leads.md` (карточка лида, где отображаются напоминания).
>
> **Восстановлено (2026-07-10):** этот файл ранее был сокращён до diff-заметок со ссылкой на «предыдущую версию документа», которая не сохранялась ни в `.docs/`, ни где-либо кроме git-истории — файл переставал быть самодостаточным источником правды. Полный текст восстановлен и приведён в соответствие с уже реализованным в проекте паттерном периодических задач (раздел «Планировщик»).

---

## Содержание

1. [Цели модуля](#цели-модуля)
2. [Архитектурные решения](#архитектурные-решения)
3. [Создание напоминания](#создание-напоминания)
4. [Редактирование и отмена](#редактирование-и-отмена)
5. [Планировщик (cron-эндпоинт)](#планировщик-cron-эндпоинт)
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

- Привязка Telegram-аккаунта → `.docs/modules/notifications.md` (уже реализовано, Phase 13)
- Настройка SMTP → ENV-переменные, вне UI (уже реализовано, `lib/email.ts`, Phase 3)
- SMS, push и другие будущие каналы → добавляются как handler в `lib/reminders/channels/`
- Компанийные настройки/дефолты напоминаний (время по умолчанию, звук, нерабочие часы и т.п.) — такой концепции в продукте нет: напоминание — персональный объект на лиде, не настройка компании

---

## Архитектурные решения

### 1. Каналы в JSONB, не в enum и не в отдельной таблице

```
channels: ["telegram", "email"]   // сейчас
channels: ["telegram", "sms"]     // завтра — без миграции
```

Поле `Reminder.channels` — JSONB-массив строк. Добавить новый канал = создать файл `lib/reminders/channels/<name>.ts` и передать его имя при создании напоминания. Схема не меняется.

### 2. Статус FIRED до реальной доставки

```
атомарный UPDATE: PENDING → FIRED (один SQL-запрос, см. п.3)
  → событие REMINDER_FIRED (writeEvent, обычным вызовом сразу после — не внутри транзакции с UPDATE)
  → ПОСЛЕ: доставка (Promise.allSettled)
    ошибка канала → событие REMINDER_FAILED в events (аудит)
```

Почему так: статус меняется **до** доставки. Сбой Telegram-API или SMTP не откатывает `FIRED` — напоминание не сработает повторно. Это осознанный выбор: лучше потерять одно уведомление, чем задолбить пользователя дублями при проблемах со сторонними сервисами. Ошибки доставки видны в журнале событий.

### 3. Guard против двойного срабатывания

```typescript
// idempotent guard — один UPDATE уже атомарен сам по себе, обёртка в $transaction не нужна
const updated = await prisma.reminder.updateMany({
  where: { id: reminder.id, status: "PENDING" },
  data: { status: "FIRED", firedAt: new Date() },
});
if (updated.count === 0) continue; // уже обработано другим вызовом — пропустить

await writeEvent(reminder.companyId, "REMINDER_FIRED", {
  leadId: reminder.leadId,
  payload: { reminderId: reminder.id },
});
```

Guard защищает от гонки: если внешний триггер вызовет обработку дважды почти одновременно (например, ретрай crontab при таймауте предыдущего запроса), только один вызов получит `count = 1` — PostgreSQL гарантирует атомарность `updateMany`. **Важно:** `writeEvent()` (`lib/events.ts`) пишет через глобальный `prisma`-клиент, а не через `tx` — её нельзя вызывать внутри `prisma.$transaction(async (tx) => …)` и ожидать атомарности с операциями внутри той же транзакции (в отличие от `closeLead`/каскадной блокировки маркетолога, которые пишут `tx.event.create()` напрямую именно потому, что находятся в транзакции). Здесь транзакция не нужна вообще — `updateMany` с условием `status: "PENDING"` уже атомарен как одиночный `UPDATE`, поэтому `writeEvent()` вызывается сразу после как обычный отдельный вызов. Реальная сигнатура — `writeEvent(companyId, type, { payload?, userId?, leadId? })`: свободного поля вроде `{ reminderId }` на верхнем уровне не существует, id напоминания кладётся в `payload`.

### 4. Планировщик — не в процессе Next.js, а внешний триггер по HTTP

**Важно (отличие от более ранних черновиков этого документа):** этот проект принципиально не запускает cron внутри процесса приложения — см. `CLAUDE.md`/`.docs/phases/_status.md` (Phase 1): «приложение само cron не запускает». Для дайджеста продления подписки (Phase 3) уже реализован рабочий паттерн: защищённый `CRON_SECRET`-эндпоинт, который раз в сутки дёргает внешний crontab на VPS. Напоминания используют тот же паттерн, только с периодом раз в минуту — без `node-cron`, без `instrumentation.ts`, без новой зависимости в `package.json`. Подробности — раздел 5.

### 5. Напоминание привязано к лиду, а не к пользователю

Напоминание создаётся на лид, `createdBy` — кто создал (для отображения). При удалении лида напоминание каскадно удаляется (`onDelete: Cascade`) и никогда не сработает. При удалении/блокировке пользователя его напоминания остаются и продолжают срабатывать — доставка по `channels` (email/telegram) от этого не зависит.

### 6. Создание/изменение/отмена не зависит от блокировки компании

Создание, редактирование и отмена напоминания — обычные мутации без отдельной проверки подписки/тарифа (биллинга в продукте нет). Единственная точка проверки доступа компании — `Company.isBlocked` при входе (`.docs/modules/auth.md`), не на уровне отдельных эндпоинтов.

```
Заблокированная компания:
  Войти                        → нельзя (проверка в authorize())
  Уже запланированное PENDING  → срабатывает по расписанию как обычно (это не действие пользователя)
```

Уже созданные `PENDING`-напоминания **продолжают срабатывать** даже у заблокированной компании — тот же принцип «лид нельзя потерять», применённый к уже взятым на себя обязательствам: остановка запланированной доставки была бы неожиданным побочным эффектом блокировки, создающим риск пропущенной договорённости с клиентом. Cron-эндпоинт обрабатывает напоминания глобально по всем компаниям и не фильтрует по `isBlocked`.

**Закрытие лида — противоположный случай, не путать с блокировкой компании.** Блокировка временна и происходит вне воли клиента, а закрытие лида — явное решение «работа по нему окончена». Поэтому `closeLead` отменяет `PENDING`-напоминания закрываемого лида (`.docs/modules/leads.md`), `processReminders` дополнительно фильтрует по `lead: { closeType: null }` (для лидов, закрытых до этого правила), а `POST /api/leads/:id/reminders` отвечает `400 LEAD_CLOSED`. Карточка закрытого лида read-only — редактирование и отмена его напоминаний тоже возвращают `LEAD_CLOSED`.

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

Редактирование не пишет отдельное событие — `EventType` не содержит `REMINDER_UPDATED` (см. `database.md`); история напоминания ограничена `REMINDER_CREATED`/`FIRED`/`FAILED`/`CANCELLED`.

### Отмена (FR-74)

`DELETE /api/leads/:id/reminders/:rid` — не физическое удаление, а `status = CANCELLED`.

```typescript
const cancelled = await prisma.reminder.update({
  where: { id: rid, companyId, status: "PENDING" }, // guard: только PENDING
  data: { status: "CANCELLED" },
});
await writeEvent(companyId, "REMINDER_CANCELLED", {
  leadId: cancelled.leadId,
  payload: { reminderId: rid },
});
```

Отменённые напоминания остаются в БД и видны в истории карточки лида (свёрнутый список).

---

## Планировщик (cron-эндпоинт)

### Запуск — внешний VPS crontab, не in-process

```
lib/reminders/processReminders.ts   — вся логика обработки (переиспользуемая функция)
app/api/cron/reminders/route.ts     — тонкий HTTP-хендлер: проверка CRON_SECRET → processReminders()
```

Эндпоинт защищён тем же способом, что и `/api/platform/cron/subscription-reminders` (Phase 3): секрет передаётся заголовком `Authorization: Bearer $CRON_SECRET`, `x-cron-secret` или query `?key=`; без сессии. Внешний crontab на VPS дёргает его раз в минуту — это ручная ops-настройка (как и ежедневный дайджест продления, см. `.docs/phases/_status.md` → Phase 1), а не код приложения:

```bash
* * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/reminders" >/dev/null
```

Точность обработки — до минуты (ограничена частотой crontab-записи), что соответствует требованию FR-70…76. При временной недоступности сервера (деплой, рестарт) пропущенные напоминания сработают на следующем тике — они не помечены `FIRED`, пока запрос не обработан.

### Логика `processReminders()`

`database.md` сознательно не дублирует код этого шага («срабатывание напоминания... — в соответствующих модулях», раздел «Критичные транзакции») — этот раздел и есть источник правды. Шаги:

```
1. Выбрать все PENDING с remindAt <= now() (по всем компаниям, без фильтра isBlocked,
   но только по НЕзакрытым лидам — lead: { closeType: null }),
   с include лида (name/phone/email) и автора (telegramChatId/email)
2. Для каждого — последовательно:
   а. prisma.reminder.updateMany({ where: { id, status: "PENDING" }, data: { status: "FIRED", firedAt } })
      count === 0 → уже обработано, пропустить (см. «Архитектурные решения» п.3)
   б. writeEvent(companyId, "REMINDER_FIRED", { leadId, payload: { reminderId } })
   в. deliverChannels(reminder) — ПОСЛЕ записи статуса (см. ниже, почему), возвращает ChannelDeliveryResult[]
   г. на каждый результат с ok: false — writeEvent(companyId, "REMINDER_FAILED", { leadId, payload: { reminderId, channel } })
3. Вернуть сводку { processed, delivered, failed } — тот же паттерн ответа,
   что и sendSubscriptionDigest() (lib/platform/subscriptionReminders.ts)
```

### Почему доставка — после фиксации статуса, а не до

Доставка в Telegram/Email — вызов внешних API, которые могут висеть секунды. `updateMany` в шаге «а» уже самодостаточно атомарен (см. п.3 «Архитектурные решения») и фиксируется мгновенно; оборачивать его вместе с медленным сетевым I/O в общую транзакцию незачем и вредно — держать открытую транзакцию/лочить строку на время внешнего запроса. Поэтому порядок строго последовательный: статус → событие → (только потом) доставка.

---

## Каналы доставки

Каждый канал — отдельный файл в `lib/reminders/channels/`. Единый интерфейс:

```typescript
// lib/reminders/channels/types.ts
export interface ReminderChannel {
  deliver(reminder: ReminderWithContext): Promise<void>; // throw при неуспехе — deliverChannels() ловит через Promise.allSettled
}
```

**Оба канала переиспользуют уже существующие в проекте утилиты** (появились после того, как исходный черновик этого модуля был написан) — не создают собственный транспорт заново.

### Telegram

```typescript
// lib/reminders/channels/telegram.ts
import { sendTelegramMessage } from "@/lib/telegram";

export async function deliver(reminder: ReminderWithContext): Promise<void> {
  const chatId = reminder.createdBy.telegramChatId;
  if (!chatId) throw new Error("Telegram не привязан");

  const ok = await sendTelegramMessage(chatId, buildReminderMessage(reminder));
  if (!ok) throw new Error("Telegram sendMessage failed"); // sendTelegramMessage возвращает false, не бросает
}

function buildReminderMessage(r: ReminderWithContext): string {
  return [
    `🔔 Напоминание по лиду`,
    `Лид: ${r.lead.name ?? r.lead.phone ?? r.lead.email ?? "—"}`,
    ``,
    r.text,
  ].join("\n");
}
```

**Использует** `lib/telegram.ts` → `sendTelegramMessage(chatId, text)` (уже есть, Phase 13). Функция сама проглатывает сетевые ошибки и возвращает `boolean` — канал-обёртка обязан превратить `false` в `throw`, иначе `deliverChannels()` не узнает о сбое и не запишет `REMINDER_FAILED`.

### Email

```typescript
// lib/reminders/channels/email.ts
import { sendEmail, isEmailConfigured } from "@/lib/email";

export async function deliver(reminder: ReminderWithContext): Promise<void> {
  if (!isEmailConfigured()) throw new Error("SMTP не настроен");

  await sendEmail({
    to: reminder.createdBy.email,
    subject: `🔔 Напоминание: ${reminder.lead.name ?? "лид"}`,
    text: reminder.text,
  });
}
```

**Использует** `lib/email.ts` → `sendEmail()` / `isEmailConfigured()` (уже есть, Phase 3). Не создаёт собственный `nodemailer.createTransport` — один транспорт-модуль на весь проект (используется также `sendPasswordResetEmail`, `sendCascadeBlockEmail`, `sendSubscriptionReminderEmail`).

### Реестр каналов

Возвращает результат **с привязкой к имени канала** — голый `PromiseSettledResult<void>[]` из `Promise.allSettled` этого не даёт (порядок совпадает с порядком вызова, но canal-имя нужно явно сопоставить обратно, иначе `processReminders()` не сможет положить корректный `channel` в `payload` события `REMINDER_FAILED`):

```typescript
// lib/reminders/channels/index.ts
import { deliver as telegram } from "./telegram";
import { deliver as email } from "./email";

const channels: Record<string, (r: ReminderWithContext) => Promise<void>> = {
  telegram,
  email,
};

export type ChannelDeliveryResult = { channel: string; ok: true } | { channel: string; ok: false; error: unknown };

export async function deliverChannels(reminder: ReminderWithContext): Promise<ChannelDeliveryResult[]> {
  const activeChannels = (reminder.channels as string[]).filter((ch) => ch in channels);

  const settled = await Promise.allSettled(activeChannels.map((ch) => channels[ch](reminder)));

  return settled.map((result, i) => {
    const channel = activeChannels[i];
    return result.status === "fulfilled"
      ? { channel, ok: true }
      : { channel, ok: false, error: result.reason };
  });
}
```

**Добавить новый канал:** создать `lib/reminders/channels/sms.ts` с функцией `deliver`, зарегистрировать в `index.ts`. Схема БД не меняется — пользователь просто передаёт `"sms"` в массиве `channels`.

---

## Отображение в карточке лида

### Блок «Напоминания» (FR-73)

Вставляется в правую колонку карточки лида (`components/reminders/ReminderBlock.tsx`), рядом с блоком задач (`TaskBlock`, каркас уже существует под Phase 15 — `ReminderBlock` строится по тому же визуальному паттерну `Card`).

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

**Исполненные и отменённые (FR-75)** — свёрнутый блок «История напоминаний» под активными. Раскрывается по клику. Показывает `firedAt` или дату отмены.

### Источник данных

`GET /api/leads/:id/reminders` возвращает все напоминания лида, отсортированные по `remindAt asc`. Клиент разделяет их на `pending` и `fired/cancelled`.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/leads/:id/reminders` | Список напоминаний по лиду | Session (`kind: "company"`, `actor: "user"`) | Видимость по роли |
| POST | `/api/leads/:id/reminders` | Создать напоминание | Session | Любой пользователь компании (MANAGER+) |
| PATCH | `/api/leads/:id/reminders/:rid` | Изменить (только PENDING) | Session | Автор или `hasMinRole(role, "ADMIN")` |
| DELETE | `/api/leads/:id/reminders/:rid` | Отменить (status→CANCELLED) | Session | Автор или `hasMinRole(role, "ADMIN")` |
| POST | `/api/cron/reminders` | Обработать все просроченные `PENDING` (все компании) | `CRON_SECRET`, без сессии | — |

> Маркетолог (`actor: "marketer"`) не входит в allow-list напоминаний (`constants/marketerAccess.ts`) — все четыре эндпоинта `/api/leads/:id/reminders*` используют `requireCompanyUser()` (жёсткий блок маркетолога, 403), не `requireCompanyAccess()`. В спецификации маркетолога (`platform-marketer.md`) напоминания не перечислены среди разрешённых действий.
>
> Права на редактирование/отмену: автор напоминания или `ADMIN` (`hasMinRole(role, "ADMIN")`, не явное сравнение). Менеджер не может отменить чужое напоминание.

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
**Response 403:** `{ "success": false, "error": "FORBIDDEN" }` (чужое напоминание, не ADMIN)

### `POST /api/cron/reminders`

**Response 200:**

```json
{ "processed": 3, "delivered": 5, "failed": 1 }
```

**Response 401:** `{ "error": "Unauthorized" }` (секрет не совпал/отсутствует)

---

## Файлы, которые создаются

```
app/
└── api/
    ├── cron/
    │   └── reminders/route.ts            # POST — CRON_SECRET → processReminders()
    └── leads/
        └── [id]/
            └── reminders/
                ├── route.ts              # GET (список), POST (создать)
                └── [rid]/route.ts        # PATCH (изменить), DELETE (отменить)

lib/
└── reminders/
    ├── processReminders.ts               # Логика срабатывания: выборка → транзакция → доставка
    └── channels/
        ├── types.ts                      # Интерфейс ReminderChannel
        ├── index.ts                      # Реестр каналов + deliverChannels()
        ├── telegram.ts                   # Доставка в Telegram (через lib/telegram.ts)
        └── email.ts                      # Доставка на Email (через lib/email.ts)

components/
└── reminders/
    ├── ReminderBlock.tsx                 # Client: блок напоминаний в карточке лида
    ├── ReminderItem.tsx                  # Client: строка активного напоминания
    ├── ReminderHistory.tsx               # Client: свёрнутая история (FIRED/CANCELLED)
    └── AddReminderModal.tsx              # Client: модалка создания/редактирования

lib/validations/
└── reminders.ts                          # Zod: createReminderSchema, updateReminderSchema
```

> `lib/reminders/scheduler.ts` (пустой `// TODO: implement` со времён ранней вёрстки каркаса) и всё, что предполагало `node-cron`/`instrumentation.ts`, — не используется; вместо него `app/api/cron/reminders/route.ts` + внешний VPS crontab (раздел 5). Файл `scheduler.ts` удаляется как неиспользуемый остаток каркаса.

---

## Серверные правила безопасности

1. **`companyId` из сессии, не из запроса.** Лид проверяется по `companyId` текущего пользователя. Нельзя создать напоминание на лид чужой компании.

2. **Видимость напоминаний через видимость лида.** Применяется `visibilityWhere` из `.docs/modules/leads.md` — менеджер в режиме `OWN` не видит напоминания на чужом лиде, потому что не видит сам лид.

3. **Редактирование и отмена — только автор или ADMIN.** Менеджер не может отменить напоминание коллеги.

4. **`remindAt` только в будущем.** Валидация при создании и редактировании. Нельзя поставить напоминание в прошлом — оно бы немедленно сработало при следующем тике cron-эндпоинта.

5. **Guard против двойного срабатывания.** `updateMany` с условием `status: PENDING` — атомарная операция PostgreSQL. При повторном/параллельном вызове `/api/cron/reminders` только один обработает конкретное напоминание.

6. **Email и Telegram недоступны без конфига.** `email.ts` проверяет `isEmailConfigured()`. `telegram.ts` проверяет наличие `telegramChatId` и результат `sendTelegramMessage()`. При отсутствии — ошибка канала логируется в `events`, не роняет обработку остальных напоминаний.

7. **Ошибки доставки не откатывают статус.** `FIRED` фиксируется в БД до вызова внешних API. Это защита от повторной отправки при временной недоступности Telegram/SMTP.

8. **Каскадное удаление с лидом.** При удалении лида (`onDelete: Cascade`) все его напоминания удаляются — cron-эндпоинт их больше не подхватит.

9. **`/api/cron/reminders` не принимает сессию.** Аутентификация — только `CRON_SECRET` (как `/api/platform/cron/subscription-reminders`), маршрут не входит в `proxy.ts` matcher.

---

## Связи с другими модулями

- **`.docs/modules/leads.md`** — карточка лида содержит блок напоминаний; `visibilityWhere` применяется к лиду прежде чем выдать его напоминания.
- **`.docs/modules/notifications.md`** — `lib/telegram.ts` (`sendTelegramMessage`) используется каналом `telegram.ts`; привязка `telegramChatId` — там же (Phase 13).
- **`CLAUDE.md`/`.docs/phases/_status.md` (Phase 1, Phase 3)** — паттерн защищённого cron-эндпоинта + внешний VPS crontab; `CRON_SECRET` уже в ENV.
- **`.docs/database.md`** — модель `Reminder`, `ReminderStatus`, транзакция «Срабатывание напоминания», составной индекс `[status, remindAt]`.
