# Модуль: Распределение лидов (assignment)

> Спецификация назначения ответственного: правила по источнику/форме (приоритетно), ручное назначение, автораспределение round-robin (фоллбэк), запасной ответственный, алерт при провале назначения.
> Связанные файлы: `.docs/database.md` (`Lead`, `User`, `AssignmentRule`, `Company.settings`, `Event`), `.docs/modules/leads-intake.md`, `.docs/modules/app-settings.md`.

---

## Содержание

1. Цели модуля
2. Три уровня распределения
3. Архитектурные решения
4. Правила по источнику/форме
5. Ручное назначение
6. Автораспределение (round-robin) — фоллбэк
7. Переназначение
8. Провал назначения и алерт
9. Краевые случаи
10. API-эндпоинты
11. Файлы, которые создаются
12. Серверные правила безопасности
13. Связи с другими модулями

---

## Цели модуля

После завершения этого модуля:

- Лиды с конкретного источника/формы уходят заранее определённому менеджеру
- Если правило не задано или его исполнитель неактивен — есть запасной ответственный
- Если и запасного нет — работает обычный режим компании (ручной/round-robin)
- Если вообще никто не назначен — руководитель получает алерт. **Активного лида без ответственного не существует**
- Round-robin и ручное назначение работают как раньше, как резервный механизм
- Каждое назначение и каждый провал назначения пишутся в историю

**Не входит в модуль:**

- Приём лида → `.docs/modules/leads-intake.md` (вызывает `assignLead` после коммита)
- Уведомление назначенному менеджеру → `.docs/modules/notifications.md`
- UI переключателя режима → `.docs/modules/app-settings.md`
- Список/карточка лида → `.docs/modules/leads.md`

---

## Три уровня распределения

Раньше было два равноправных режима (`MANUAL`/`ROUND_ROBIN`), переключаемых флагом. Теперь это **иерархия проверок**, не взаимоисключающий выбор:

```
1. AssignmentRule (по источнику/форме, с приоритетом и запасным) — проверяется первым
   ↓ не сработало (нет подходящего правила, исполнитель и запасной оба неактивны)
2. Company.settings.assignMode (MANUAL → лид без ответственного / ROUND_ROBIN → по кругу) — фоллбэк
   ↓ не сработало (ROUND_ROBIN, но активных менеджеров нет)
3. Лид остаётся без ответственного → алерт руководителю (ASSIGNMENT_FAILED)
```

`assignMode` не упразднён — он остаётся осмысленным резервным поведением для всех лидов, на которые нет специального правила.

---

## Архитектурные решения

### 1. Единая точка входа `assignLead` — реализована (Phase 11, Таск 1)

`tryAssignmentRules` возвращает не `boolean`, а тристейт `"assigned" | "matched_but_failed" | "no_match"` — иначе не выразить разницу между «правило не подошло» (норма для `MANUAL`) и «правило подошло, но не смогло назначить» (это и есть повод для алерта). `ASSIGNMENT_FAILED` внутри `assignLead` пишется через реальный `writeEvent(companyId, type, opts)` (`lib/events.ts`), не через сигнатуру из более раннего псевдокода этого раздела.

```typescript
// lib/assignLead.ts
async function assignLead(leadId: string, companyId: string): Promise<void> {
  const ruleResult = await tryAssignmentRules(leadId, companyId); // уровень 1
  if (ruleResult === "assigned") return;

  const assignMode = readAssignMode(company.settings); // "MANUAL" | "ROUND_ROBIN", дефолт MANUAL на битый JSONB

  if (assignMode === "ROUND_ROBIN") {
    // pickNextManager + updateMany(lead) + tx.event.create("ASSIGNED") — одна транзакция (advisory lock)
    const managerId = await prisma.$transaction(async (tx) => { /* см. «Автораспределение» */ });
    if (managerId) return;

    await writeEvent(companyId, "ASSIGNMENT_FAILED", { leadId }); // уровень 3, случай (б)
    return;
  }

  // MANUAL: без событий, если правило вообще не подошло — это норма
  if (ruleResult === "matched_but_failed") {
    await writeEvent(companyId, "ASSIGNMENT_FAILED", { leadId }); // уровень 3, случай (а)
  }
}

async function assignLeadTo(
  leadId: string,
  companyId: string,
  managerId: string | null,
  actorUserId: string,
): Promise<void>; // ручное назначение/снятие — пишет ASSIGNED, roundRobinCursor не трогает
```

### 2–4. Назначение после коммита, round-robin через курсор + advisory lock, событие `ASSIGNED`

Реализовано как описано: `void assignLead(lead.id, companyId).catch(console.error)` во всех точках приёма (ручное создание — `await` с тем же `.catch`, ошибка не роняет ответ). Детали round-robin — см. раздел «Автораспределение» ниже.

---

## Правила по источнику/форме

### Поведение (FR-190…192)

Админ настраивает правила в `/admin/settings` (или отдельной секции интеграций — решение UI-реализации):

```
Правило: source = "yandex"        → assignTo: Алексей,  fallback: Мария
Правило: sourceLabel = "landing-vip" → assignTo: Мария,   fallback: (нет)
Правило: source = null (любой), sourceLabel = null (любая) → можно использовать как "общий" фоллбэк-приоритет
```

`priority` определяет порядок проверки — меньшее число проверяется раньше. Первое подходящее активное правило побеждает.

### Серверная логика

`lib/assignmentRules.ts` — `lead.marketing` читается type-safe через локальный narrow-хелпер (`readSourceLabel`, без `any`), назначение — `updateMany({ where: { id, companyId } })`, не голый `update({ where: { id } })`:

```typescript
export type AssignmentRuleResult = "assigned" | "matched_but_failed" | "no_match";

async function tryAssignmentRules(leadId: string, companyId: string): Promise<AssignmentRuleResult> {
  const lead = await prisma.lead.findFirstOrThrow({ where: { id: leadId, companyId }, select: { source: true, marketing: true } });
  const sourceLabel = readSourceLabel(lead.marketing); // narrow-хелпер, JSONB → string | null

  const rules = await prisma.assignmentRule.findMany({
    where: { companyId, isActive: true },
    orderBy: { priority: "asc" },
    include: { assignTo: true, fallbackTo: true },
  });

  let matched = false;

  for (const rule of rules) {
    const sourceMatches = !rule.matchSource || rule.matchSource === lead.source;
    const labelMatches = !rule.matchSourceLabel || rule.matchSourceLabel === sourceLabel;
    if (!sourceMatches || !labelMatches) continue;

    matched = true;

    const target = !rule.assignTo.isBlocked ? rule.assignTo : (rule.fallbackTo && !rule.fallbackTo.isBlocked ? rule.fallbackTo : null);
    if (!target) continue; // оба неактивны — пробуем следующее правило

    const updated = await prisma.lead.updateMany({ where: { id: leadId, companyId }, data: { assignedToId: target.id } });
    if (updated.count === 0) continue;

    await writeEvent(companyId, "ASSIGNED", { payload: { toUserId: target.id, viaRule: rule.id }, leadId });
    return "assigned";
  }

  return matched ? "matched_but_failed" : "no_match";
}
```

---

## Ручное назначение

`PATCH /api/leads/:id/assign` — доступно Руководителю и Администратору (`hasMinRole(role, "HEAD")`), не только Администратору: «распределение нагрузки» — прямая обязанность роли Руководитель (раздел 3.2 `prd.md`). `managerId = null` снимает ответственного.

---

## Автораспределение (round-robin) — фоллбэк-уровень

`lib/roundRobin.ts` — `pickNextManager(tx, companyId)` **должна** вызываться внутри той же транзакции, что держит `pg_advisory_xact_lock(hashtext(companyId))`: лок живёт только на время транзакции, поэтому чтение курсора, выбор менеджера и запись нового курсора — всё в `tx`. Выборка — точное сравнение `role: "MANAGER"` (не `hasMinRole`): HEAD/ADMIN намеренно исключены, получают лиды только правилом или вручную.

```typescript
async function pickNextManager(tx: Prisma.TransactionClient, companyId: string): Promise<string | null> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}))`;

  const managers = await tx.user.findMany({
    where: { companyId, role: "MANAGER" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, isBlocked: true },
  });
  const active = managers.filter((m) => !m.isBlocked);
  if (active.length === 0) return null; // пустой список активных → null

  const company = await tx.company.findUniqueOrThrow({ where: { id: companyId }, select: { settings: true } });
  const cursor = readRoundRobinCursor(company.settings); // narrow-хелпер JSONB → string | null
  const cursorIndex = cursor ? managers.findIndex((m) => m.id === cursor) : -1;

  // Курсор указывает на удалённого/заблокированного — это НЕ ошибка: цикл ниже
  // всё равно находит следующего активного по кругу от его позиции в общем списке.
  let next = active[0];
  if (cursorIndex !== -1) {
    for (let offset = 1; offset <= managers.length; offset++) {
      const candidate = managers[(cursorIndex + offset) % managers.length];
      if (candidate && !candidate.isBlocked) { next = candidate; break; }
    }
  }

  await tx.company.update({ where: { id: companyId }, data: { settings: { ...rawSettings, roundRobinCursor: next.id } } });
  return next.id;
}
```

Вызывающая сторона (`assignLead`) оборачивает `pickNextManager` вместе с `lead.updateMany` и `tx.event.create({ type: "ASSIGNED" })` в один `prisma.$transaction` — событие пишется через `tx.event.create` напрямую (паттерн `createLead`), не через `writeEvent`, потому что `writeEvent` использует глобальный `prisma` и `auth()` и не может участвовать в транзакции. `roundRobinCursor` сдвигает только этот путь — `assignLeadTo` его не трогает.

---

## Переназначение — без изменений

Не сдвигает `roundRobinCursor`.

---

## Провал назначения и алерт

### Поведение (FR-193) — решено окончательно в Phase 11

`ASSIGNMENT_FAILED` пишется ровно в двух случаях, не более:

```
(а) Правило совпало (matched), но не смогло назначить — основной и запасной
    оба неактивны — и ни одно следующее правило по priority тоже не сработало,
    И assignMode = MANUAL (фоллбэк тоже не назначил)
(б) assignMode = ROUND_ROBIN, но активных менеджеров нет
```

**Чистый `MANUAL` без единого совпавшего правила — норма, без события.** Если бы алерт слался при любом `MANUAL`-лиде без ответственного, компания в `MANUAL`-режиме получала бы алерт на каждый лид — это и есть шум, которого нужно избежать (`.docs/modules/notifications.md`). Отсюда и тристейт `tryAssignmentRules` (`assigned | matched_but_failed | no_match`) — булевым результатом эту разницу не выразить. Доставка алерта (Telegram/SSE) — Phase 12/13; здесь — только событие в журнале.

---

## Краевые случаи — расширены

```
Случай: правило указывает на менеджера, который позже заблокирован
→ при следующем срабатывании этого правила used fallbackTo, если задан
→ если fallback тоже неактивен/не задан — правило пропускается, проверяется следующее по priority

Случай: два правила формально подходят одному лиду
→ выигрывает с наименьшим priority — порядок имеет значение, дублирующиеся правила не складываются

Случай: правило ссылается на источник, которого больше нет (например, отключили интеграцию)
→ правило просто не срабатывает (нет совпадения) — не ошибка, не требует очистки

Случай: менеджер на позиции курсора удалён или заблокирован
→ не ошибка — берётся первый активный менеджер, следующий за его позицией по кругу
→ ручное назначение/снятие (assignLeadTo) курсор не читает и не сдвигает
```

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| PATCH | `/api/leads/:id/assign` | Назначить/переназначить/снять | Session | Руководитель, Администратор |
| GET/POST | `/api/assignment-rules` | Список / создать правило | Session | ADMIN only (настройка) |
| PATCH/DELETE | `/api/assignment-rules/:id` | Изменить / удалить правило | Session | ADMIN only (настройка) |

### `POST /api/assignment-rules`

**Request:** `{ "matchSource": "yandex", "matchSourceLabel": null, "assignToId": "clxxx", "fallbackToId": "clyyy", "priority": 1 }`

**Response 200:** `{ "id": "clzzz", ... }`

---

## Файлы, которые создаются

```
app/
└── api/
    ├── leads/[id]/assign/route.ts
    └── assignment-rules/
        ├── route.ts
        └── [id]/route.ts

lib/
├── assignLead.ts                    # переписан: 3 уровня
├── assignmentRules.ts                # НОВОЕ: tryAssignmentRules()
└── roundRobin.ts

lib/validations/
└── assign.ts                         # + assignmentRuleSchema

components/
├── leads/
│   └── AssignManagerSelect.tsx
└── admin/settings/
    └── AssignmentRulesList.tsx       # НОВОЕ: управление правилами
```

---

## Серверные правила безопасности

1–8 без изменений относительно предыдущей версии (проверка `companyId`, round-robin только активные менеджеры, advisory lock, курсор сдвигает только автораспределение, событие `ASSIGNED`, назначение не блокирует приём, `managerId` валидируется), кроме: ручное назначение — теперь `hasMinRole(role, "HEAD")`, не строго `ADMIN` (см. раздел «Ручное назначение»). `AssignmentRule` (настройка правил) остаётся ADMIN-only.

9. **Правила (`AssignmentRule`) проверяются и редактируются только в пределах своей компании.** `assignToId`/`fallbackToId` обязаны быть пользователями той же компании — иначе `400 WRONG_COMPANY`.

10. **`ASSIGNMENT_FAILED` — не для каждого `MANUAL`-лида без ответственного**, только когда ни одно правило не подошло, чтобы не превратить штатный режим в постоянный шум алертов (детали приоритезации — `notifications.md`).

---

## Связи с другими модулями

- **`.docs/modules/leads-intake.md`** — вызывает `assignLead(leadId, companyId)` после коммита приёма.
- **`.docs/modules/notifications.md`** — уведомление назначенному; финальная логика, когда слать `ASSIGNMENT_FAILED`-алерт руководителю.
- **`.docs/modules/app-settings.md`** — `assignMode` как фоллбэк-уровень 2.
- **`.docs/modules/admin-users.md`** — список менеджеров для правил и ручного назначения; блокировка влияет на оба уровня.
- **`.docs/database.md`** — модель `AssignmentRule`, `EventType.ASSIGNMENT_FAILED`.
