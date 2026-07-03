# Модуль: Приём лидов (leads-intake)

> Спецификация приёма заявок из всех источников: Tilda, WordPress, универсальный webhook, Яндекс Директ, ручной ввод. Парсинг полей, сохранение в JSONB, аутентификация источников, пометка возможных дублей, мониторинг здоровья источников.
> Связанные файлы: `.docs/database.md` (модели `Lead`, `ApiKey`, `Event`, `DuplicateFlag`, `IntegrationSource`), `.docs/modules/assignment.md`, `.docs/modules/notifications.md`, `.docs/modules/integrations.md`, `.docs/modules/leads.md` (синхронная проверка дублей при ручном создании).

---

## Содержание

1. Цели модуля
2. Главный инвариант: лид нельзя потерять
3. Архитектурные решения
4. Разбор полей лида (парсинг)
5. Источник: Tilda
6. Источник: WordPress
7. Источник: универсальный webhook
8. Источник: Яндекс Директ
9. Аутентификация источников
10. Транзакция приёма
11. Пометка возможных дублей
12. Мониторинг здоровья источника
13. API-эндпоинты
14. Файлы, которые создаются
15. Серверные правила безопасности
16. Связи с другими модулями

---

## Цели модуля

После завершения этого модуля:

- Заявки с Tilda, WordPress и универсального webhook принимаются и сохраняются без потерь
- Лиды Яндекс Директа принимаются в двух режимах (полный API / минимальный UTM)
- Любые нестандартные поля формы сохраняются без потерь (JSONB)
- Совпадение по телефону/email помечается как возможный дубль — **без блокировки приёма и без слияния**
- Каждый принятый лид создаёт событие `LEAD_CREATED`
- Каждая попытка приёма (успешная и неуспешная) обновляет статус здоровья источника
- После приёма запускаются распределение, уведомления и проверка дублей

**Не входит в модуль:**

- Назначение ответственного → `.docs/modules/assignment.md`
- Отправка уведомлений → `.docs/modules/notifications.md`
- UI настройки интеграций, генерация ключей → `.docs/modules/integrations.md`
- Импорт CSV/Excel (другой механизм создания лидов, не вебхук) → `.docs/modules/import.md`
- WhatsApp как источник — рассматривался в одной из версий, **решили полностью отказаться**, не реализуется ни в каком виде
- Слияние дублей — **не реализуется**, см. раздел 11

---

## Главный инвариант: лид нельзя потерять

```
Принцип «если → то»:
─────────────────────────────────────────────────────
Пришло известное поле                      → в колонку Lead
Пришло UTM-поле                            → в Lead.utm
Пришло маркетинговое поле                  → в Lead.marketing
Пришло любое другое поле                   → в Lead.customFields
Поле пустое/отсутствует                     → null, приём продолжается
Совпадение по телефону/email с другим лидом → лид создаётся, ставится DuplicateFlag — НЕ блокирует
Компания заблокирована платформенным админом → лид всё равно создаётся (см. ниже)
Тело запроса вообще не JSON                → пробуем form-urlencoded, потом сырой текст
```

Единственное, что может отклонить приём — **невалидный API-ключ** или **rate limit**. Ни структура данных, ни возможный дубль, ни блокировка компании приём не блокируют.

**Важно про блокировку компании:** приём лидов — это запись в БД, но это НЕ ручное действие пользователя компании, это внешний источник присылает заявку. `Company.isBlocked` (см. `CLAUDE.md`, `.docs/database.md`) проверяется только при входе пользователя — webhook-эндпоинты приёма лидов эту проверку не выполняют вообще, ни до, ни после блокировки. Если блокировка компании временная, все лиды, пришедшие за это время, будут на месте после разблокировки.

---

## Архитектурные решения

### 1. Отдельный эндпоинт на источник + один общий обработчик

```
/api/webhooks/tilda/[companyId]      → парсер Tilda      ─┐
/api/webhooks/wordpress/[companyId]  → парсер WordPress  ─┼─→ общий core: normalizeLead() → транзакция приёма
/api/webhooks/leads                  → парсер generic    ─┘
```

### 2. `companyId` в пути Tilda/WordPress

Компаний много с первого дня (создаёт платформенный администратор, см. `.docs/modules/platform-admin.md`). Сервер берёт `companyId` напрямую из параметра пути, без сессии и без API-ключа.

```typescript
// app/api/webhooks/tilda/[companyId]/route.ts
export async function POST(req: Request, { params }: { params: { companyId: string } }) {
  const { companyId } = params;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = await req.formData();
  if (body.get("test") === "test") return Response.json({ success: true }); // тестовый запрос Tilda

  await createLead(Object.fromEntries(body), "tilda", companyId);
  await touchIntegrationSource(companyId, "tilda");
  return Response.json({ success: true });
}
```

Обратите внимание: проверки `company.isBlocked` здесь нет и не должно быть — компания может быть заблокирована (никто из неё не может войти), но её webhook продолжает принимать заявки.

### 3. Раскладка полей по «известности»

`constants/fieldAliases.ts`, регистронезависимое сопоставление, всё нераспознанное — в `customFields` с оригинальным ключом.

### 4. Приём отделён от обвязки

Транзакция сохраняет лид + событие. **После** коммита, не блокируя ответ:

```
коммит приёма
  → touchIntegrationSource(companyId, source)  // обновить здоровье источника
  → flagPossibleDuplicates(leadId)       // пометка дублей, событие DUPLICATE_FLAGGED
  → assignLead(leadId, companyId)         // assignment: AssignmentRule → assignMode → ASSIGNMENT_FAILED (Phase 11)
  → notifyNewLead(leadId)                // notifications: SSE + Telegram (Phase 13)
```

Во всех трёх вебхуках — `void assignLead(lead.id, companyId).catch(console.error)`, как и `flagPossibleDuplicates`: ошибка внутри назначения не должна ронять ответ `200 OK` источнику (паттерн `flagPossibleDuplicates`). В ручном создании лида (`POST /api/leads`) — допустимо `await assignLead(...)` с тем же `.catch`, поскольку там уже есть человек у экрана, ожидающий ответ, но ошибка назначения всё равно не должна возвращать не-201 ответ.

---

## Разбор полей лида (парсинг)

`normalizeLead(raw, source)` — извлекает известные поля (имя, телефон, email, комментарий), раскладывает UTM в `utm`, прочую маркетинговую информацию в `marketing`, всё остальное — в `customFields`. Не выбрасывает ошибку на неизвестную структуру.

---

## Источник: Tilda

`/api/webhooks/tilda/[companyId]`. Тестовый запрос (`test=test`) — `200 OK` без создания лида. Имя формы и страница — в `marketing`.

## Источник: WordPress

`/api/webhooks/wordpress/[companyId]`. Поддержка CF7/WPForms/Gravity Forms через их webhook-расширения, формат тела (JSON или form-urlencoded) определяется автоматически.

## Источник: универсальный webhook

`POST /api/webhooks/leads?key=<API_KEY>&source=<label>` (или `X-API-Key`) — принимает любой JSON. `companyId` и метка (`sourceLabel`) определяются из `ApiKey`, не из пути и не из тела.

**`Lead.source` — всегда канонический `"api"`, не метка ключа.** Метка (`ApiKey.sourceLabel`) кладётся в `marketing.sourceLabel` поверх результата `normalizeLead`, не затирая остальные marketing-поля из тела запроса: `createLead(body, "api", companyId, sourceLabel)` — 4-й параметр `createLead` (`lib/intake/createLead.ts`), опциональный, используется только этим источником. Матчинг `AssignmentRule` (`.docs/modules/assignment.md`) — `matchSource` ↔ `Lead.source` (`"api"`), `matchSourceLabel` ↔ `marketing.sourceLabel` (метка ключа): без этого фикса правило по label никогда бы не совпало, а канал `api` терялся бы в `Lead.source`.

## Источник: Яндекс Директ

Два режима (полный через API / минимальный через UTM), фолбэк-логика — без изменений относительно предыдущих версий.

---

## Аутентификация источников

| Эндпоинт | Аутентификация | Обязательна? |
| --- | --- | --- |
| `/api/webhooks/tilda/[companyId]` | `companyId` из пути, существование компании проверяется | Да (без валидного `companyId` — 404) |
| `/api/webhooks/wordpress/[companyId]` | `companyId` из пути | Да |
| `/api/webhooks/leads` | API-ключ (`key` или `X-API-Key`) | Да |

Проверка API-ключа по хэшу — `lib/intake/verifyApiKey.ts`.

### Rate limiting

60/мин на ключ или IP, с запасом под легитимные всплески.

---

## Транзакция приёма

`stageId` нового лида = первый этап воронки (`order = 0`). Ответ webhook'у `200 OK` — сразу после коммита. Полный код — `.docs/database.md` → «Критичные транзакции → Приём лида».

---

## Пометка возможных дублей

### Когда выполняется

```
Приём через любой вебхук (Tilda/WordPress/универсальный):
  → лид создаётся ВСЕГДА, инвариант не нарушается
  → ПОСЛЕ коммита: flagPossibleDuplicates(leadId, companyId)
  → найдено совпадение по phone или email среди лидов той же компании
  → создаётся DuplicateFlag (на каждое совпадение, до 5 последних)
  → событие DUPLICATE_FLAGGED
  → ответственный видит пометку постфактум — в списке и в карточке
```

### Что НЕ делает эта проверка

Не отклоняет приём. Не объединяет записи. Не уведомляет отдельным алертом.

Для **ручного создания** (через UI, есть человек у экрана) проверка работает синхронно, ДО сохранения — см. `.docs/modules/leads.md`.

### Реализация

```typescript
// lib/intake/flagPossibleDuplicates.ts
export async function flagPossibleDuplicates(leadId: string, companyId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (!lead.phone && !lead.email) return;

  const matches = await prisma.lead.findMany({
    where: {
      companyId,
      id: { not: leadId },
      OR: [lead.phone ? { phone: lead.phone } : undefined, lead.email ? { email: lead.email } : undefined]
        .filter(Boolean) as Prisma.LeadWhereInput[],
    },
    take: 5,
  });

  for (const match of matches) {
    const matchType = lead.phone && match.phone === lead.phone ? "PHONE" : "EMAIL";
    await prisma.duplicateFlag.create({ data: { companyId, leadId, matchedLeadId: match.id, matchType } });
    await writeEvent(companyId, "DUPLICATE_FLAGGED", { matchedLeadId: match.id, matchType }, null, leadId);
  }
}
```

---

## Мониторинг здоровья источника

### Назначение

Видеть, что источник, который раньше присылал заявки регулярно, замолчал — раньше, чем это заметит сам бизнес.

### Что обновляется при каждой попытке приёма

```typescript
// lib/intake/touchIntegrationSource.ts
export async function touchIntegrationSource(companyId: string, type: string, label?: string, failed = false) {
  await prisma.integrationSource.upsert({
    where: { companyId_type_label: { companyId, type, label: label ?? "" } },
    update: failed
      ? { lastErrorAt: new Date(), errorCount: { increment: 1 } }
      : { lastUsedAt: new Date(), errorCount: 0 },
    create: { companyId, type, label: label ?? "", lastUsedAt: failed ? undefined : new Date(), lastErrorAt: failed ? new Date() : undefined, errorCount: failed ? 1 : 0 },
  });
}
```

Вызывается из каждого webhook-эндпоинта (успех — после коммита; неуспех — например, при отказе по API-ключу, ДО ответа `401`, чтобы счётчик ошибок рос и при невалидных ключах).

**Алерт о «молчащем» источнике** — отдельный cron, см. `.docs/modules/notifications.md` → «Мониторинг источников».

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Rate limit |
| --- | --- | --- | --- | --- |
| POST | `/api/webhooks/tilda/[companyId]` | Приём заявок Tilda для конкретной компании | По `companyId` в пути | 60 / мин на IP |
| POST | `/api/webhooks/wordpress/[companyId]` | Приём из плагинов WordPress | По `companyId` в пути | 60 / мин на IP |
| POST | `/api/webhooks/leads` | Универсальный приём (любой JSON) | API-ключ | 60 / мин на ключ |

---

## Файлы, которые создаются

```
app/
└── api/
    └── webhooks/
        ├── tilda/[companyId]/route.ts
        ├── wordpress/[companyId]/route.ts
        └── leads/route.ts

lib/
└── intake/
    ├── createLead.ts
    ├── normalizeLead.ts
    ├── parseBody.ts
    ├── verifyApiKey.ts
    ├── flagPossibleDuplicates.ts
    ├── touchIntegrationSource.ts
    └── yandex.ts

constants/
└── fieldAliases.ts

lib/validations/
└── intake.ts
```

---

## Серверные правила безопасности

1. **Приём не падает из-за данных, дублей или блокировки компании.** Throw допустим только при невалидном `companyId`/ключе или rate limit.
2. **API-ключ обязателен на `/leads`.** Без ключа — `401`.
3. **`companyId` — из пути (Tilda/WordPress) или из ключа (универсальный), никогда из тела запроса.**
4. **Ключ сравнивается по хэшу**, plain-значение не логируется.
5. **Санитизация — при отображении, не при приёме.**
6. **Rate limiting обязателен** на всех эндпоинтах.
7. **`flagPossibleDuplicates` не блокирует и не замедляет ответ webhook'у** — выполняется после коммита, асинхронно к ответу.
8. **`touchIntegrationSource` вызывается при ЛЮБОЙ попытке** (успех и провал).
9. **Проверка `Company.isBlocked` не должна появляться ни в одном webhook-эндпоинте приёма** — это сознательное архитектурное решение, не упущение. Если код-ревью видит такую проверку здесь — это баг.

---

## Связи с другими модулями

- **`.docs/modules/assignment.md`** — `assignLead(leadId, companyId)` после коммита.
- **`.docs/modules/notifications.md`** — `notifyNewLead(leadId)`; мониторинг здоровья источников.
- **`.docs/modules/integrations.md`** — UI карточек источников, генерация API-ключей, отображение статуса здоровья.
- **`.docs/modules/leads.md`** — синхронная проверка дублей при ручном создании; отображение пометки дубля.
- **`.docs/database.md`** — модели `Lead`, `ApiKey`, `Event`, `DuplicateFlag`, `IntegrationSource`.
