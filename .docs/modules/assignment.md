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

### 1. Единая точка входа `assignLead` — расширена

```typescript
// lib/assignLead.ts
async function assignLead(leadId: string, companyId: string): Promise<void> {
  const assigned = await tryAssignmentRules(leadId, companyId);   // НОВОЕ, уровень 1
  if (assigned) return;

  const fallbackAssigned = await tryFallbackMode(leadId, companyId); // уровень 2 (было единственным)
  if (fallbackAssigned) return;

  await writeEvent(companyId, "ASSIGNMENT_FAILED", {}, null, leadId); // уровень 3
  // нотификация руководителю — notifications.md
}

async function assignLeadTo(leadId: string, managerId: string | null, actorId: string): Promise<void>; // без изменений — ручное назначение/переназначение
```

### 2–4. Назначение после коммита, round-robin через курсор + advisory lock, событие `ASSIGNED` — без изменений

См. предыдущую версию документа и `.docs/database.md` → «Критичные транзакции».

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

```typescript
async function tryAssignmentRules(leadId: string, companyId: string): Promise<boolean> {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const rules = await prisma.assignmentRule.findMany({
    where: { companyId, isActive: true },
    orderBy: { priority: "asc" },
    include: { assignTo: true, fallbackTo: true },
  });

  for (const rule of rules) {
    const sourceMatches = !rule.matchSource || rule.matchSource === lead.source;
    const labelMatches = !rule.matchSourceLabel || rule.matchSourceLabel === lead.marketing?.sourceLabel;
    if (!sourceMatches || !labelMatches) continue;

    const target = (!rule.assignTo.isBlocked && rule.assignTo) || (rule.fallbackTo && !rule.fallbackTo.isBlocked ? rule.fallbackTo : null);
    if (!target) continue; // оба неактивны — пробуем следующее правило

    await prisma.lead.update({ where: { id: leadId }, data: { assignedToId: target.id } });
    await writeEvent(companyId, "ASSIGNED", { toUserId: target.id, viaRule: rule.id }, null, leadId);
    return true;
  }
  return false;
}
```

---

## Ручное назначение

`PATCH /api/leads/:id/assign` — доступно Руководителю и Администратору (`hasMinRole(role, "HEAD")`), не только Администратору: «распределение нагрузки» — прямая обязанность роли Руководитель (раздел 3.2 `prd.md`). `managerId = null` снимает ответственного.

---

## Автораспределение (round-robin) — без изменений, теперь фоллбэк-уровень

Логика курсора, advisory lock, учёт только активных менеджеров — без изменений. Разница только в том, **когда** этот механизм вызывается: после того, как `AssignmentRule` не дал результата.

---

## Переназначение — без изменений

Не сдвигает `roundRobinCursor`.

---

## Провал назначения и алерт

### Поведение (FR-193)

```
Если → ни одно правило не сработало
     И assignMode = MANUAL (лид без ответственного — это ожидаемо в этом режиме)
     ИЛИ assignMode = ROUND_ROBIN, но активных менеджеров нет
То   → лид остаётся без ответственного
     → событие ASSIGNMENT_FAILED
     → Telegram руководителю: «Лид {имя} ({источник}) не назначен — нет доступных менеджеров»
```

**Важное уточнение:** в режиме `MANUAL` отсутствие ответственного после приёма — это нормальная, ожидаемая часть рабочего процесса (админ назначает вручную), а не сбой. Алерт `ASSIGNMENT_FAILED` шлётся **только если не сработали правила** — иначе компания в `MANUAL`-режиме получала бы алерт на каждый лид, что противоречит принципу «не плодить шум» (`.docs/modules/notifications.md`). Точная настройка этого нюанса (слать ли алерт при обычном `MANUAL` без правил) — финализируется в `.docs/modules/notifications.md`, где видна вся картина приоритетов алертов.

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

(краевые случаи round-robin — без изменений, см. предыдущую версию)
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

- **`.docs/modules/leads-intake.md`** — вызывает `assignLead(leadId)` после коммита приёма.
- **`.docs/modules/notifications.md`** — уведомление назначенному; финальная логика, когда слать `ASSIGNMENT_FAILED`-алерт руководителю.
- **`.docs/modules/app-settings.md`** — `assignMode` как фоллбэк-уровень 2.
- **`.docs/modules/admin-users.md`** — список менеджеров для правил и ручного назначения; блокировка влияет на оба уровня.
- **`.docs/database.md`** — модель `AssignmentRule`, `EventType.ASSIGNMENT_FAILED`.
