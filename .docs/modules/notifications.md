# Модуль: Уведомления (notifications)

> Спецификация уведомлений: SSE и Telegram, трёхступенчатая эскалация первого ответа, разделение алертов по роли, мониторинг здоровья источников.
> Связанные файлы: `.docs/database.md` (`Lead`, `User`, `Company.settings`, `IntegrationSource`), `.docs/modules/leads-intake.md`, `.docs/modules/assignment.md`, `.docs/modules/risk.md` (общие нормативы), `.docs/modules/app-settings.md`.

---

## Содержание

1. Цели модуля
2. Два канала уведомлений
3. Архитектурные решения
4. SSE — уведомления в интерфейсе
5. Telegram-уведомления
6. Привязка Telegram-аккаунта
7. Счётчик непрочитанных
8. Точка запуска: notifyNewLead
9. Разделение уведомлений по роли
10. Контроль: трёхступенчатая эскалация первого ответа
11. Контроль: зависшие лиды (ежедневная сводка)
12. Мониторинг источников
13. API-эндпоинты
14. Файлы, которые создаются
15. Серверные правила безопасности
16. Связи с другими модулями

---

## Цели модуля

После завершения этого модуля:

- Новый лид появляется в интерфейсе в реальном времени (SSE) и в Telegram у назначенного
- Менеджер получает операционные алерты, руководитель — управленческие — без пересечения
- Первый ответ контролируется тремя ступенями, не одним алертом: напоминание менеджеру → красный статус → уведомление руководителю
- Норматив реакции переопределяется по источнику, этапу, сотруднику
- Ежедневная сводка о зависших лидах — без изменений в идее, обновлена формула лимита (per-stage)
- Замолчавший источник лидов обнаруживается и о нём сообщается руководителю
- Пользователь может отключать отдельные типы уведомлений
- Уведомления никогда не блокируют приём лида

**Не входит в модуль:**

- Приём лида → `.docs/modules/leads-intake.md`
- Определение ответственного → `.docs/modules/assignment.md`
- Алгоритм цвета/причины риска → `.docs/modules/risk.md` (этот модуль уведомляет на основе тех же нормативов, но не вычисляет риск сам)
- Email как канал уведомлений (кроме напоминаний) — out of scope

---

## Два канала уведомлений — без изменений

SSE (всем подключённым компании) + Telegram (назначенному, если привязан и включено) — механика не менялась, см. предыдущую версию документа.

---

## Архитектурные решения — без изменений в основе

SSE, не WebSocket. Единая точка запуска `notifyNewLead`. Уведомления не блокируют и не валят приём (try/catch). In-memory реестр SSE-подключений.

---

## SSE — уведомления в интерфейсе — без изменений

## Telegram-уведомления — без изменений в доставке, шаблоны разделены по роли (см. раздел 9)

## Привязка Telegram-аккаунта — без изменений

## Счётчик непрочитанных — без изменений

## Точка запуска: notifyNewLead — без изменений по существу

`notifyNewLead` вызывается после `autoAssignLead` (теперь — после всех трёх уровней распределения, см. `.docs/modules/assignment.md`), не до.

---

## Разделение уведомлений по роли

### Поведение (FR-152, FR-153)

«Руководитель» в таблице ниже означает «`hasMinRole(role, "HEAD")`» — то есть и Руководитель, и Администратор получают эти алерты (иерархия ролей, раздел 3 `prd.md`); Администратор не выключен из управленческих уведомлений просто потому, что у него есть ещё и доступ к настройкам.

| Получатель | Тип | Когда |
| --- | --- | --- |
| Менеджер | Новый лид | При назначении |
| Менеджер | Срок ответа приближается | Ступень 1 эскалации (см. раздел 10) |
| Менеджер | Задача скоро просрочится / просрочена | По `dueDate` задачи |
| Менеджер | Лид слишком долго на этапе | Превышен лимит этапа/компании |
| Менеджер | Нет следующего действия | Лид без открытой задачи (мягкий, не навязчивый — раз в день, не на каждое изменение) |
| Руководитель и Администратор | Лид не обработан | Ступень 3 эскалации |
| Руководитель и Администратор | Нет ответственного | `ASSIGNMENT_FAILED` (см. `assignment.md`) |
| Руководитель и Администратор | Критическая просрочка | Красный статус риска, не снятый долгое время |
| Руководитель и Администратор | Накопились зависшие лиды | Ежедневная сводка (раздел 11) |
| Руководитель и Администратор | Источник перестал передавать заявки | Мониторинг источников (раздел 12) |
| Руководитель и Администратор | Конец дня — остались необработанные лиды | Ежедневная сводка, отдельная от сводки зависших |

### Отключение типов (FR-153)

```typescript
// User.notificationPreferences — JSONB
type NotificationPreferences = { disabledTypes: EventType[] };
```

Перед отправкой Telegram-уведомления любого типа — проверка, не в списке ли он отключён у получателя. SSE не отключается (это интерфейс, не канал, который можно «забить» спамом) — отключение применяется только к Telegram.

---

## Контроль: трёхступенчатая эскалация первого ответа

### Что считается первым ответом — без двусмысленности

**Только событие `LEAD_TAKEN_IN_WORK`** (кнопка «Взял в работу», `.docs/modules/leads.md`). Открытие карточки (`LEAD_OPENED`) и смена этапа сами по себе **не** останавливают эскалацию — раньше это создавало двусмысленность, которую Техничка прямо просила убрать.

### Три ступени (FR-91)

Пример при нормативе 15 минут (значения процентов настраиваются, дефолты — 66% и 133%):

```
T + 66%  (≈10 мин) → LEAD_REACTION_REMINDED  → Telegram менеджеру: «Лид {имя} ждёт ответа {N} мин»
T + 100% (15 мин)  → LEAD_REACTION_OVERDUE   → риск становится красным (вычисляется risk.md, это не отдельная запись на лиде)
T + 133% (≈20 мин) → LEAD_REACTION_ESCALATED → Telegram руководителю: «Лид {имя} не обработан {N} мин, ответственный: {менеджер}»
```

Любая ступень пропускается, если к моменту проверки уже есть `LEAD_TAKEN_IN_WORK` — цепочка останавливается целиком, не только текущий шаг.

### Норматив — переопределяемый

Норматив и применимые проценты читаются через `resolveApplicableNorm()` (`.docs/modules/risk.md`) — приоритет сотрудник > этап > источник > общий дефолт. Один и тот же расчёт используется и здесь (для отправки алертов), и в `risk.md` (для цвета бейджа) — нормативы не дублируются в двух местах с риском разойтись.

### Cron — увеличена частота относительно предыдущей версии

```
Было: каждые 5 минут
Стало: каждую минуту
```

**Почему:** с появлением переопределения норматива по источнику (например, для конкретной формы лендинга — 10 минут) и трёхступенчатой схемой с шагом примерно в треть норматива, 5-минутное разрешение слишком грубое — отдельные ступени могут «провалиться» между проверками на коротких нормативах. Минутный cron даёт точность, сопоставимую с напоминаниями (`.docs/modules/reminders.md`), и не создаёт ощутимой нагрузки — выборка узкая (`LEAD_REACTION_*` ещё не отправлены для этого лида, см. ниже).

### Защита от повторной отправки одной ступени

```typescript
// lib/control/checkReactionTime.ts — концепт
const candidates = await prisma.lead.findMany({
  where: { companyId, closeType: null, assignedToId: { not: null } },
  include: { events: { where: { type: { in: ["LEAD_TAKEN_IN_WORK", "LEAD_REACTION_REMINDED", "LEAD_REACTION_OVERDUE", "LEAD_REACTION_ESCALATED"] } } } },
});

for (const lead of candidates) {
  if (lead.events.some((e) => e.type === "LEAD_TAKEN_IN_WORK")) continue; // цепочка остановлена

  const norm = resolveApplicableNorm(lead);
  const minutes = diffMinutes(now(), lead.createdAt, norm.workHoursOnly);
  const sent = new Set(lead.events.map((e) => e.type));

  if (minutes >= norm.defaultMinutes * (norm.escalateAfterPercent / 100) && !sent.has("LEAD_REACTION_ESCALATED")) {
    await writeEvent(companyId, "LEAD_REACTION_ESCALATED", {}, null, lead.id);
    await notifyManagement(lead, "ESCALATED");
  } else if (minutes >= norm.defaultMinutes && !sent.has("LEAD_REACTION_OVERDUE")) {
    await writeEvent(companyId, "LEAD_REACTION_OVERDUE", {}, null, lead.id);
    // красный статус — следствие самого события через risk.md, отдельного действия не требуется
  } else if (minutes >= norm.defaultMinutes * (norm.reminderBeforePercent / 100) && !sent.has("LEAD_REACTION_REMINDED")) {
    await writeEvent(companyId, "LEAD_REACTION_REMINDED", {}, null, lead.id);
    await notifyManager(lead, "REMINDED");
  }
}
```

Каждая ступень — `once per lead`, проверяется по наличию соответствующего события в `events`, как и раньше с единственным алертом.

---

## Контроль: зависшие лиды (ежедневная сводка)

### Поведение — без изменений в идее, обновлена формула лимита (FR-92, FR-93, FR-120)

```
Лимит для конкретного лида = PipelineStage.stageTimeLimitDays ?? Company.settings.stageStuckDaysDefault
```

Раньше лимит был только компанийским; теперь — переопределяемым по этапу (см. `.docs/modules/pipeline.md`). Cron (`checkStuckLeads.ts`) запускается раз в день в `stuckCheckTime`, собирает сводку — механика сборки сообщения не изменилась.

### Дополнено: конец дня — отдельная сводка необработанных (FR-152)

```
Отдельный cron, раз в день (например, в 18:00 или конец рабочего дня компании, если задан workHours):
  → выбрать лиды компании без LEAD_TAKEN_IN_WORK, созданные сегодня
  → если есть хотя бы один → Telegram руководителю: сводный список
```

Это не дублирует трёхступенчатую эскалацию (которая идёт по каждому лиду индивидуально и в реальном времени) — это отдельный «итог дня», управленческий, не операционный.

---

## Мониторинг источников

### Назначение (FR-160…163)

Обнаружить, что источник, который раньше присылал заявки, замолчал — раньше, чем это заметит сам бизнес.

### Логика

```typescript
// lib/control/checkSourceHealth.ts — cron, раз в час
const sources = await prisma.integrationSource.findMany({
  where: { companyId, lastUsedAt: { not: null } }, // только те, что хоть раз были активны — новый, ещё не настроенный источник не считается "замолчавшим"
});

for (const source of sources) {
  const threshold = company.settings.sourceHealthThresholdHours; // дефолт 3
  const hoursSinceLastUse = diffHours(now(), source.lastUsedAt);

  if (hoursSinceLastUse > threshold && !source.alertedDown) {
    await writeEvent(companyId, "SOURCE_DOWN", { type: source.type, label: source.label, hoursSilent: hoursSinceLastUse });
    await notifyManagement(companyId, `Источник "${source.type}" не передаёт заявки последние ${hoursSinceLastUse} часов`);
    // отметить как уже сообщённый — реализация: поле или отдельная проверка по последнему SOURCE_DOWN-событию
  }
  if (hoursSinceLastUse <= threshold /* источник снова используется после того, как был отмечен молчащим */) {
    await writeEvent(companyId, "SOURCE_RECOVERED", { type: source.type, label: source.label });
  }
}
```

«Уже сообщённый» — проверяется по наличию более позднего `SOURCE_DOWN`, чем последний `SOURCE_RECOVERED`/`lastUsedAt`-обновление, чтобы не слать алерт каждый час подряд об одном и том же молчании — аналогичный принцип «once per problem», что и у `LEAD_REACTION_ESCALATED`.

### Статус на странице интеграций

`/admin/integrations` показывает для каждого источника: активен / последняя ошибка / когда замолчал — данные те же `IntegrationSource`, см. `.docs/modules/integrations.md`.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/stream` | SSE-поток | Session | ADMIN / MANAGER |
| POST/DELETE | `/api/telegram/bind` | Привязка/отвязка Telegram | Session | ADMIN / MANAGER |
| POST | `/api/telegram/webhook` | Webhook бота | Bot secret | — |
| PATCH | `/api/users/me/notification-preferences` | Отключить/включить типы уведомлений | Session | ADMIN / MANAGER (только свои) |

---

## Файлы, которые создаются

```
app/
└── api/
    ├── stream/route.ts
    ├── telegram/
    │   ├── bind/route.ts
    │   └── webhook/route.ts
    └── users/me/notification-preferences/route.ts   # НОВОЕ

lib/
├── sse.ts
├── telegram.ts
├── notifications/
│   ├── notifyNewLead.ts
│   ├── notifyManager.ts             # НОВОЕ: операционные алерты
│   └── notifyManagement.ts          # НОВОЕ: управленческие алерты, фильтр по отключённым типам
└── control/
    ├── checkReactionTime.ts          # переписан: 3 ступени, частота — раз в минуту
    ├── checkStuckLeads.ts            # формула лимита — per-stage с фоллбэком
    ├── checkEndOfDaySummary.ts       # НОВОЕ
    └── checkSourceHealth.ts          # НОВОЕ

constants/
└── telegramTemplates.ts              # + шаблоны для всех новых типов событий

store/
└── notificationStore.ts

components/
├── notifications/
│   ├── Toast.tsx
│   ├── NotificationBell.tsx
│   ├── NotificationDropdown.tsx
│   ├── SseProvider.tsx
│   └── TelegramBindButton.tsx
└── profile/
    └── NotificationPreferencesForm.tsx   # НОВОЕ
```

---

## Серверные правила безопасности

1–11 без изменений относительно предыдущей версии (изоляция по `companyId` в SSE, минимум данных в событии, try/catch вокруг уведомлений, секреты только на сервере, одноразовый `bindToken`, защищённый webhook бота, heartbeat, `LEAD_OPENED` один раз на пользователя), кроме: настройки контроля (нормативы, пороги, рабочее время) — только Администратор; сами управленческие алерты получают и Руководитель, и Администратор (см. раздел 9).

12. **Каждая ступень эскалации — `once per lead`**, проверяется по наличию соответствующего события, не по времени последней проверки cron — иначе пропуск одного запуска cron привёл бы к повторной отправке.

13. **`SOURCE_DOWN`/`SOURCE_RECOVERED` — `once per problem`**, не на каждый часовой прогон cron при сохраняющемся молчании.

14. **Отключение типов уведомлений действует только на Telegram**, не на SSE и не на сами события в `events` — журнал не становится менее полным из-за личных предпочтений по уведомлениям.

---

## Связи с другими модулями

- **`.docs/modules/leads-intake.md`** — `touchIntegrationSource` обновляет данные, которые здесь читает `checkSourceHealth`.
- **`.docs/modules/assignment.md`** — назначение до уведомления; `ASSIGNMENT_FAILED` — управленческий алерт.
- **`.docs/modules/risk.md`** — общий `resolveApplicableNorm()`; красный статус — следствие `LEAD_REACTION_OVERDUE`, не отдельный расчёт.
- **`.docs/modules/leads.md`** — `LEAD_TAKEN_IN_WORK` останавливает эскалацию.
- **`.docs/modules/pipeline.md`** — `stageTimeLimitDays` как лимит для сводки зависших.
- **`.docs/modules/app-settings.md`** — хранение всех нормативов, процентов, `sourceHealthThresholdHours`, рабочего времени.
- **`.docs/modules/integrations.md`** — отображение здоровья источников на странице интеграций.
- **`.docs/database.md`** — `User.notificationPreferences`, `Company.settings.sourceHealthThresholdHours`, `IntegrationSource`.
