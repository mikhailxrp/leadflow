# Модуль: Настройки системы (app-settings)

> Спецификация глобальных настроек компании: распределение, видимость, Telegram, Яндекс, контроль и его нормативы (теперь переопределяемые), мониторинг источников. Принцип модуля не изменился: только хранение и переключение флагов, применение — в соответствующих модулях.
> Связанные файлы: `.docs/database.md` (`Company.settings`), `.docs/modules/assignment.md`, `.docs/modules/leads.md`, `.docs/modules/notifications.md`, `.docs/modules/risk.md`, `.docs/modules/pipeline.md`, `.docs/modules/integrations.md`.

---

## Содержание

1. Цели модуля
2. Архитектурные решения
3. Структура настроек
4. Режим распределения и видимость — без изменений
5. Переключатель Telegram — без изменений
6. Режим Яндекс Директа — без изменений
7. Контроль за работой менеджеров — нормативы с переопределением
8. Рабочее время
9. Мониторинг источников — порог
10. Причины отказа — CRUD
11. API-эндпоинты
12. Файлы, которые создаются
13. Серверные правила безопасности
14. Связи с другими модулями

---

## Цели модуля

После завершения этого модуля:

- Все флаги компании хранятся в одном месте, читаются и применяются другими модулями
- Нормативы реакции настраиваются с переопределением по источнику/этапу/сотруднику
- Можно включить учёт рабочего времени при расчёте норматива первого ответа
- Порог молчания источника для алерта о «замолчавшем» источнике настраивается
- Изменение настройки сразу влияет на поведение — без изменений в принципе

**Не входит в модуль:**

- Логика самого распределения → `.docs/modules/assignment.md`
- Применение видимости → `.docs/modules/leads.md`
- Расчёт риска и эскалация → `.docs/modules/risk.md`, `.docs/modules/notifications.md` (этот модуль только хранит нормативы)
- Управление API-ключами, OAuth Яндекса → `.docs/modules/integrations.md`

---

## Архитектурные решения — без изменений в принципе

Все настройки в `Company.settings` (JSONB), один эндпоинт `PATCH /api/settings` с частичным апдейтом, дефолты задаёт регистрация компании (раньше — сидер).

### Дополнено: частичный апдейт теперь мёржит и на уровне вложенных объектов

Раньше `PATCH` мёржил только верхний уровень (`{ assignMode: "..." }` не трогая остальное). Теперь, с появлением вложенной структуры `reactionNorms` с картами переопределений (`bySource`, `byStage`, `byUser`), мёрж должен быть **глубоким** на этом конкретном поле — иначе добавление одного override стирало бы остальные.

```typescript
// lib/settings/updateSettings.ts — концепт
async function updateSettings(companyId: string, patch: Partial<CompanySettings>) {
  const current = await getSettings(companyId);
  const merged = {
    ...current,
    ...patch,
    reactionNorms: patch.reactionNorms
      ? {
          ...current.reactionNorms,
          ...patch.reactionNorms,
          bySource: { ...current.reactionNorms.bySource, ...patch.reactionNorms?.bySource },
          byStage: { ...current.reactionNorms.byStage, ...patch.reactionNorms?.byStage },
          byUser: { ...current.reactionNorms.byUser, ...patch.reactionNorms?.byUser },
        }
      : current.reactionNorms,
  };
  await prisma.company.update({ where: { id: companyId }, data: { settings: merged } });
}
```

Удаление конкретного override (например, убрать переопределение для одного источника) — передать `null` под этим ключом, обработка `null` как «удалить ключ», не как «установить null»-значение.

---

## Структура настроек

```typescript
type CompanySettings = {
  assignMode: "MANUAL" | "ROUND_ROBIN";
  leadVisibility: "ALL" | "OWN";
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

Включение/отключение конкретного источника — это создание/удаление API-ключа в `.docs/modules/integrations.md`, не флаг в настройках компании.

### Дефолты

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

Задаются при создании компании платформенным администратором (`.docs/modules/platform-admin.md`), не сидером и не самой компанией.

---

## Режим распределения и видимость, переключатель Telegram, режим Яндекс Директа — без изменений

См. предыдущую версию документа.

---

## Контроль за работой менеджеров — нормативы с переопределением

### UI (`/admin/settings` → раздел «Контроль») — только Администратор

**Важно развести два разных экрана, которые легко спутать:** здесь — только настройка нормативов и порогов. Сам дашборд со счётчиком активности менеджеров живёт на отдельной странице `/control`, доступной с уровня Руководителя (см. `.docs/modules/leads.md` → «Страница контроля») — это сознательное разделение по ролям, не одна и та же страница с разными вкладками.

- Тумблер «Включить контроль»
- Норматив реакции по умолчанию (минуты)
- Проценты ступеней эскалации (напоминание/эскалация руководителю) — с разумными дефолтами, редко требуют изменения
- **Таблица переопределений**: добавить строку «источник/этап/сотрудник → свой норматив» (UI поверх `bySource`/`byStage`/`byUser`)
- Лимит зависания по умолчанию (дни) — для этапов без своего `stageTimeLimitDays`
- Время ежедневной сводки
- Порог молчания источника (`sourceHealthThresholdHours`)
- **Правила автоматического назначения** (`AssignmentRule`) — здесь же, по той же логике: настройка правил — конфигурация (Администратор), а ручное переназначение конкретного лида day-to-day — операционное действие Руководителя (см. `.docs/modules/assignment.md`)

### Почему дефолт контроля — выключен

Алерты руководителю и администратору — чувствительная функция, неправильные пороги создают шум. Администратор включает осознанно.

---

## Рабочее время

### Поведение

```
workHours: { start: "09:00", end: "18:00", days: [1,2,3,4,5] }  // Пн–Пт, 1=понедельник
reactionNorms.workHoursOnly: true → норматив первого ответа считается только в указанные часы/дни
```

Если лид пришёл в пятницу в 19:00 при графике Пн–Пт 09:00–18:00 — отсчёт норматива первого ответа начинается с понедельника 09:00, не с момента создания. Используется только для минутного норматива реакции (`.docs/modules/risk.md`), не для многодневного лимита «зависания» на этапе — там разница в часах не значима на горизонте нескольких дней.

---

## Мониторинг источников — порог

### Поведение

`sourceHealthThresholdHours` (дефолт 3) — через сколько часов молчания ранее активного источника отправляется `SOURCE_DOWN`-алерт. Один порог на всю компанию (не по каждому источнику отдельно) — для MVP этого достаточно, разные пороги для разных источников можно добавить позже как ещё одну карту переопределений по тому же принципу, что `reactionNorms.bySource`, если понадобится.

---

## Причины отказа

### Назначение и поведение

`LossReason` — собственная модель (не часть `Company.settings`): список записей переменной длины с порядком, тот же паттерн, что `PipelineStage`. Дефолтный набор создаётся при регистрации компании (`.docs/modules/platform-admin.md`): Дорого, Выбрал конкурента, Не удалось связаться, Нецелевой, Нет бюджета, Отложил, Не подошли условия, Дубль, Другое.

```
Создание   → POST /api/loss-reasons { label }                  → добавляется в конец (order = max+1)
Переименование → PATCH /api/loss-reasons/:id { label }
Переупорядочивание → PATCH /api/loss-reasons/reorder { orderedIds }  → пересчёт order в транзакции
Удаление   → DELETE /api/loss-reasons/:id
```

```
Если → причина используется хотя бы одним закрытым лидом (lossReasonId ссылается на неё)
То   → удаление запрещено, 400 LOSS_REASON_IN_USE — иначе у закрытых лидов лиды "осиротеет" lossReasonId
       Альтернатива для пользователя: переименовать вместо удаления, или сначала вручную решить, что делать с историей
```

UI — на странице `/admin/settings`, рядом с остальными настройками контроля (логически смежная функция администрирования), но технически отдельный CRUD-ресурс, не JSONB-флаг.

### API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/loss-reasons` | Список причин компании | Session | ADMIN / MANAGER (для отображения при закрытии лида) |
| POST | `/api/loss-reasons` | Создать | Session | ADMIN only |
| PATCH | `/api/loss-reasons/:id` | Переименовать | Session | ADMIN only |
| PATCH | `/api/loss-reasons/reorder` | Переупорядочить | Session | ADMIN only |
| DELETE | `/api/loss-reasons/:id` | Удалить (если не используется) | Session | ADMIN only |

### Файлы

```
app/api/loss-reasons/
├── route.ts            # GET, POST
├── [id]/route.ts        # PATCH, DELETE
└── reorder/route.ts

components/admin/settings/
└── LossReasonsList.tsx  # CRUD-список с drag-and-drop порядка, как StagesList в pipeline.md

lib/validations/
└── lossReasons.ts        # Zod: createLossReasonSchema
```

### Серверные правила безопасности

- **Все операции — с `companyId` из сессии.** Причины изолированы по тенанту.
- **Создание/изменение/удаление/порядок — только ADMIN.** Менеджер только читает список (нужен для UI закрытия лида отказом).
- **Удаление с проверкой использования** — нельзя удалить причину, на которую ссылается хотя бы один лид.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/settings` | Текущие настройки (без служебных) | Session | Любая роль (чтение) |
| PATCH | `/api/settings` | Изменить (частично, глубокий мёрж `reactionNorms`) | Session | ADMIN only |

### `PATCH /api/settings`

**Request (добавить переопределение для источника, не теряя остальные):**
```json
{ "reactionNorms": { "bySource": { "tilda": 10 } } }
```

**Request (убрать переопределение):**
```json
{ "reactionNorms": { "bySource": { "tilda": null } } }
```

---

## Файлы, которые создаются

```
app/
├── (admin)/admin/settings/page.tsx
└── api/settings/route.ts

lib/
└── settings/
    ├── getSettings.ts
    └── updateSettings.ts              # глубокий мёрж reactionNorms

components/admin/settings/
├── AssignModeToggle.tsx
├── VisibilityToggle.tsx
├── TelegramToggle.tsx
├── ReactionNormsForm.tsx               # НОВОЕ
├── ReactionNormOverridesTable.tsx       # НОВОЕ: bySource/byStage/byUser
├── WorkHoursForm.tsx                    # НОВОЕ
└── SourceHealthThresholdField.tsx       # НОВОЕ

lib/validations/
└── settings.ts                          # + reactionNorms, workHours, sourceHealthThresholdHours
```

---

## Серверные правила безопасности

1–7 без изменений относительно предыдущей версии (PATCH только ADMIN, `companyId` из сессии, `roundRobinCursor` нельзя задать через API, значения валидируются, частичный апдейт мёржит — теперь и глубоко, GET не отдаёт служебные поля, дефолты гарантированы).

8. **Глубокий мёрж применяется только к `reactionNorms`** — остальные поля мёржатся как раньше (плоско). Нет общего рекурсивного мёржа всего объекта — это было бы избыточно и менее предсказуемо.

9. **`null` в карте переопределений = удалить ключ**, не записать `null` как значение нормы (норма в минутах не может быть `null`/0 — `0` отклоняется валидацией).

---

## Связи с другими модулями

- **`.docs/modules/assignment.md`**, **`.docs/modules/leads.md`** — без изменений (читают `assignMode`/`leadVisibility`).
- **`.docs/modules/risk.md`**, **`.docs/modules/notifications.md`** — читают `reactionNorms`, `workHours`, `stageStuckDaysDefault` через общий `resolveApplicableNorm()`.
- **`.docs/modules/pipeline.md`** — `stageStuckDaysDefault` как фоллбэк для этапов без `stageTimeLimitDays`.
- **`.docs/modules/integrations.md`** — `sourceHealthThresholdHours`; статусы здоровья источников.
- **`.docs/database.md`** — `Company.settings`, `LossReason` (отдельная модель).
