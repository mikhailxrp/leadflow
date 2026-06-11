# Модуль: Приём лидов (leads-intake)

> Спецификация приёма заявок из всех источников: Tilda, WordPress, универсальный webhook, Яндекс Директ. Парсинг полей, сохранение в JSONB, аутентификация источников.
> Связанные файлы: `.docs/database.md` (модели `Lead`, `ApiKey`, `Event`), `.docs/modules/assignment.md` (назначение после приёма), `.docs/modules/notifications.md` (уведомления после приёма), `.docs/modules/integrations.md` (управление API-ключами в UI).

---

## Содержание

1. [Цели модуля](#цели-модуля)
2. [Главный инвариант: лид нельзя потерять](#главный-инвариант-лид-нельзя-потерять)
3. [Архитектурные решения](#архитектурные-решения)
4. [Разбор полей лида (парсинг)](#разбор-полей-лида-парсинг)
5. [Источник: Tilda](#источник-tilda)
6. [Источник: WordPress](#источник-wordpress)
7. [Источник: универсальный webhook](#источник-универсальный-webhook)
8. [Источник: Яндекс Директ](#источник-яндекс-директ)
9. [Аутентификация источников](#аутентификация-источников)
10. [Транзакция приёма](#транзакция-приёма)
11. [API-эндпоинты](#api-эндпоинты)
12. [Файлы, которые создаются](#файлы-которые-создаются)
13. [Серверные правила безопасности](#серверные-правила-безопасности)
14. [Связи с другими модулями](#связи-с-другими-модулями)

---

## Цели модуля

После завершения этого модуля:

- Заявки с форм Tilda принимаются и сохраняются со всеми полями
- Заявки из WordPress (CF7, WPForms, Gravity Forms) принимаются через webhook
- Любой сторонний сайт может слать лиды на универсальный webhook по API-ключу
- Лиды Яндекс Директа принимаются в двух режимах (полный API / минимальный UTM)
- Любые нестандартные поля формы сохраняются без потерь (JSONB)
- UTM-метки и маркетинговые данные извлекаются из любого источника
- Каждый принятый лид создаёт событие `LEAD_CREATED`
- После приёма запускаются распределение и уведомления (другие модули)

**Не входит в модуль:**

- Назначение ответственного менеджера → `.docs/modules/assignment.md`
- Отправка уведомлений (SSE, Telegram) → `.docs/modules/notifications.md`
- UI настройки интеграций и генерация ключей → `.docs/modules/integrations.md`
- Отображение лида в списке и карточке → `.docs/modules/leads.md`
- Дедупликация — **не выполняется намеренно** (FR-06): каждая заявка = отдельный лид

---

## Главный инвариант: лид нельзя потерять

**Приём заявки никогда не падает из-за структуры данных.** Это центральное правило модуля.

```
Принцип «если → то»:
─────────────────────────────────────────────────────
Пришло известное поле (имя/телефон/email) → в колонку Lead
Пришло UTM-поле                            → в Lead.utm (JSONB)
Пришло маркетинговое поле                  → в Lead.marketing (JSONB)
Пришло любое другое поле                   → в Lead.customFields (JSONB)
Поле пустое / отсутствует                  → null, приём продолжается
Структура неожиданная                      → пишем как есть, не падаем
Тело запроса вообще не JSON                → пробуем form-urlencoded, потом сырой текст
```

Единственное, что может отклонить приём — **невалидный API-ключ** (на универсальном webhook) или **rate limit**. Структура данных отклонить приём не может.

**Почему так:** лид — это деньги бизнеса. Потерять заявку из-за того, что форма прислала неожиданное поле — недопустимо. Лучше сохранить «грязный» лид и разобрать руками, чем потерять.

---

## Архитектурные решения

### 1. Отдельный эндпоинт на источник + один общий обработчик

```
/api/webhooks/tilda      → парсер Tilda      ─┐
/api/webhooks/wordpress  → парсер WordPress  ─┼─→ общий core: normalizeLead() → транзакция приёма
/api/webhooks/leads      → парсер generic    ─┘
```

Каждый источник имеет свой тонкий парсер (знает формат конкретной платформы), но все сходятся в общей функции `lib/intake/createLead.ts`. Это убирает дублирование транзакции и логики событий.

### 2. Парсер устойчив к формату тела

Tilda шлёт `application/x-www-form-urlencoded`, многие плагины — `application/json`, некоторые — `multipart/form-data`. Обработчик определяет тип и приводит к плоскому объекту `Record<string, unknown>` до разбора полей.

### 3. Раскладка полей по «известности»

Список известных ключей (синонимы имени/телефона/email на разных языках и в разных формах) — в `constants/fieldAliases.ts`. Всё, что не распознано — уходит в `customFields`. Список синонимов расширяется без миграций.

### 4. Приём отделён от обвязки

Транзакция сохраняет лид + событие. Назначение менеджера и уведомления идут **после** коммита, не блокируя ответ webhook'у. Сбой Telegram не должен мешать приёму. См. `.docs/database.md` → «Критичные транзакции → Приём лида».

---

## Разбор полей лида (парсинг)

Функция `normalizeLead(raw, source)` превращает плоский объект формы в структуру для записи.

```typescript
// lib/intake/normalizeLead.ts — концепт
type NormalizedLead = {
  name: string | null;
  phone: string | null;
  email: string | null;
  comment: string | null;
  utm: Record<string, string>;
  marketing: Record<string, unknown>;
  customFields: Record<string, unknown>;
};

function normalizeLead(raw: Record<string, unknown>, source: LeadSource): NormalizedLead {
  const utm: Record<string, string> = {};
  const marketing: Record<string, unknown> = {};
  const customFields: Record<string, unknown> = {};
  let name = null, phone = null, email = null, comment = null;

  for (const [key, value] of Object.entries(raw)) {
    const k = key.toLowerCase().trim();

    if (NAME_ALIASES.has(k))        name = String(value);
    else if (PHONE_ALIASES.has(k))  phone = String(value);
    else if (EMAIL_ALIASES.has(k))  email = normalizeEmail(String(value));
    else if (COMMENT_ALIASES.has(k)) comment = String(value);
    else if (k.startsWith("utm_"))  utm[k] = String(value);
    else if (MARKETING_KEYS.has(k)) marketing[k] = value;
    else                            customFields[key] = value; // оригинальный ключ, без потерь
  }

  return { name, phone, email, comment, utm, marketing, customFields };
}
```

**Ключевые правила парсинга:**

- `email` нормализуется: `toLowerCase().trim()`
- `phone` сохраняется как пришёл (нормализация номеров — отдельная задача, не в MVP)
- Известные ключи распознаются регистронезависимо
- В `customFields` ключ сохраняется **в оригинальном виде** (не lowercase) — чтобы менеджер видел, как поле называлось в форме
- `MARKETING_KEYS`: `referer`, `referrer`, `landing`, `landing_page`, `source`, `traffic_source` и др.

---

## Источник: Tilda

### Формат

Tilda шлёт `POST` с `application/x-www-form-urlencoded`. Поля формы + служебные (`formid`, `formname`). При первой настройке Tilda делает тестовый запрос с полем `test=test` — на него надо ответить `200`, иначе вебхук не сохранится.

### Обработка

1. Ответить `200 OK` на тестовый запрос (`test` в теле) — без создания лида
2. Распарсить form-urlencoded → плоский объект
3. `normalizeLead(raw, "TILDA")`
4. Имя формы (`formname`) и страницу — в `marketing`
5. Транзакция приёма

### Особенности

- Tilda не шлёт API-ключ — эндпоинт `/api/webhooks/tilda` определяет компанию иначе (в Boxed одна компания; в SaaS — по поддомену/токену в URL, задел на будущее)
- Новые поля формы появляются автоматически в `customFields` (FR-05) — адаптация без доработки

---

## Источник: WordPress

### Формат

Зависит от плагина. Поддерживаем три популярных:

| Плагин | Способ отправки |
| --- | --- |
| Contact Form 7 | через дополнение (CF7 to Webhook / CF7 to API) шлёт JSON |
| WPForms | встроенный webhook-action (Pro) или хук → JSON |
| Gravity Forms | Webhooks Add-On → JSON |

Администратор вставляет URL `/api/webhooks/wordpress?key=<API_KEY>` в настройки плагина (FR-04). Кода на стороне WP не требуется.

### Обработка

1. Проверить API-ключ (параметр `key`)
2. Распарсить тело (JSON или form-urlencoded — зависит от плагина)
3. `normalizeLead(raw, "WORDPRESS")`
4. Транзакция приёма

### Особенности

- Структура полей у плагинов разная — спасает `customFields`: что не распознали, сохранили
- Один API-ключ на сайт; метка источника (`sourceLabel`) из `ApiKey` уточняет, с какого именно сайта лид

---

## Источник: универсальный webhook

### Формат

`POST /api/webhooks/leads?key=<API_KEY>&source=<label>` — принимает **любой JSON** (FR-02). Для кастомных сайтов, лендингов, Webflow, Битрикс и т.д.

```
POST /api/webhooks/leads?key=sk_live_xxx&source=landing-promo
Content-Type: application/json

{ "name": "Иван", "phone": "+7...", "любое_поле": "значение" }
```

### Обработка

1. Проверить API-ключ (параметр `key` или заголовок `X-API-Key`) — обязательно (FR-03)
2. Определить источник: параметр `source` или `sourceLabel` ключа (FR-07)
3. `normalizeLead(raw, "API")`
4. Транзакция приёма

### Особенности

- Самый гибкий вход. Аутентификация по ключу обязательна — иначе кто угодно зальёт мусор
- `source` из запроса попадает в `marketing.source`, а `LeadSource` в БД = `API`

---

## Источник: Яндекс Директ

Реализуются **два режима** (FR — Яндекс). Режим зависит от того, получен ли доступ к API Директа.

### Режим 1: Полный (через API Яндекс Директа) — приоритетный

Получаем и сохраняем в `Lead.marketing`:

- `campaignId`, `campaignName`
- `adGroupId`, `adText`
- `keyword` (ключевая фраза, если доступна)
- `device` (тип устройства)
- `region`
- `source` (источник перехода)

Реализация зависит от способа интеграции (Offline Conversions API / выгрузки). Требует OAuth-доступа к рекламному кабинету клиента.

### Режим 2: Минимальный (только UTM) — фолбэк

Если доступ к API не получен — берём только UTM-метки из URL перехода (как у обычного лида с лендинга). `utm_source=yandex`, `utm_medium=cpc` и т.д. попадают в `Lead.utm`.

### Решение о режиме

```
Если → есть OAuth-доступ к кабинету Яндекс Директа
То   → режим 1 (полный): тянем campaign/adGroup/keyword/device/region
Иначе→ режим 2 (UTM-only): только метки из URL, source=yandex

Переключение — настройка в модуле integrations. По умолчанию режим 2 (он всегда работает).
```

**Почему два режима:** API Яндекс Директа сложный и требует доступа к кабинету клиента, который может быть не получен к старту. Минимальный режим работает всегда и не блокирует запуск.

---

## Аутентификация источников

| Эндпоинт | Аутентификация | Обязательна? |
| --- | --- | --- |
| `/api/webhooks/tilda` | определение компании по URL/конфигу | В Boxed — нет (одна компания) |
| `/api/webhooks/wordpress` | API-ключ (`key`) | Да |
| `/api/webhooks/leads` | API-ключ (`key` или `X-API-Key`) | Да |

### Проверка API-ключа

```typescript
// lib/intake/verifyApiKey.ts — концепт
async function verifyApiKey(rawKey: string): Promise<ApiKey | null> {
  const hash = hashKey(rawKey);                       // тот же алгоритм, что при создании
  const key = await prisma.apiKey.findFirst({ where: { keyHash: hash } });
  return key; // null → 401
}
```

Ключ хранится хэшированным (`ApiKey.keyHash`), сравниваем хэши. Найденный ключ даёт `companyId` и `sourceLabel`.

### Rate limiting

Публичные webhook-эндпоинты под rate limiting (`lib/rateLimit.ts`) — защита от флуда. Ключ лимита: API-ключ (если есть) или IP. Лимит подбирается с запасом под реальный поток заявок (например, 60/мин), чтобы не резать легитимные всплески.

---

## Транзакция приёма

Полный код — в `.docs/database.md` → «Критичные транзакции → Приём лида». Кратко:

```
1. В транзакции:
   - prisma.lead.create({ companyId, name, phone, email, comment, source,
                          stageId: firstStage, utm, marketing, customFields })
   - prisma.event.create({ type: "LEAD_CREATED", leadId, payload: { source } })

2. ПОСЛЕ коммита (не блокируя ответ webhook'у 200 OK):
   - assignLead(leadId)            → .docs/modules/assignment.md
   - notifyNewLead(leadId)         → .docs/modules/notifications.md (SSE + Telegram)
```

`stageId` нового лида = первый этап воронки компании (`order = 0`).

**Ответ webhook'у:** `200 OK` отдаётся сразу после коммита транзакции. Распределение и уведомления — асинхронно, их сбой не отражается на ответе источнику.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Rate limit |
| --- | --- | --- | --- | --- |
| POST | `/api/webhooks/tilda` | Приём заявок Tilda | По конфигу | 60 / мин на IP |
| POST | `/api/webhooks/wordpress` | Приём из плагинов WordPress | API-ключ | 60 / мин на ключ |
| POST | `/api/webhooks/leads` | Универсальный приём (любой JSON) | API-ключ | 60 / мин на ключ |

### `POST /api/webhooks/leads`

**Request:**

```
POST /api/webhooks/leads?key=sk_live_xxx&source=landing-promo
Content-Type: application/json

{ "name": "Иван Петров", "phone": "+79990000000", "email": "ivan@mail.ru",
  "utm_source": "google", "utm_campaign": "spring", "custom_question": "Интересует тариф X" }
```

**Response 200 (успех):**

```json
{ "success": true, "leadId": "clxxx..." }
```

**Response 401 (неверный/отсутствует ключ):**

```json
{ "success": false, "error": "INVALID_API_KEY" }
```

**Response 429 (rate limit):**

```json
{ "success": false, "error": "RATE_LIMIT_EXCEEDED" }
```

> Ошибки структуры данных не возвращаются — лид принимается всегда при валидном ключе (главный инвариант).

### `POST /api/webhooks/tilda`

**Тестовый запрос (при настройке вебхука в Tilda):**

```
test=test  →  Response 200 { "success": true }   (лид не создаётся)
```

**Боевой запрос:** form-urlencoded поля формы → лид создаётся → `200 OK`.

---

## Файлы, которые создаются

```
app/
└── api/
    └── webhooks/
        ├── tilda/route.ts          # POST: приём Tilda (+ обработка test-запроса)
        ├── wordpress/route.ts      # POST: приём WordPress (по ключу)
        └── leads/route.ts          # POST: универсальный приём (по ключу)

lib/
└── intake/
    ├── createLead.ts               # Общая транзакция приёма (lead + event)
    ├── normalizeLead.ts            # Разбор полей по известности → структура
    ├── parseBody.ts                # Определение типа тела (json/form/multipart) → плоский объект
    ├── verifyApiKey.ts             # Проверка API-ключа (хэш-сравнение)
    └── yandex.ts                   # Логика двух режимов Яндекс Директа

constants/
└── fieldAliases.ts                 # Синонимы name/phone/email/comment + MARKETING_KEYS

lib/validations/
└── intake.ts                       # Zod: минимальная схема query (key, source)
```

Транзакция использует `lib/events.ts` (writeEvent) и общий `lib/prisma.ts`.

---

## Серверные правила безопасности

1. **Приём не падает из-за данных.** Любая ошибка парсинга полей → поле в `customFields`, не throw. Throw допустим только при невалидном ключе или rate limit.

2. **API-ключ обязателен на `/leads` и `/wordpress`.** Без валидного ключа — `401`, лид не создаётся. Защита от заливки мусора кем угодно.

3. **`companyId` берётся из API-ключа или конфига, никогда из тела запроса.** Источник не может прислать чужой `companyId`.

4. **Ключ сравнивается по хэшу.** Plain-ключ нигде не хранится и не логируется. В логах ошибок — только факт «невалидный ключ», без самого значения.

5. **Санитизация при отображении, не при приёме.** Сырые данные формы пишутся как есть (чтобы не потерять). Экранирование от XSS — на этапе вывода в UI (модуль leads), а не на приёме.

6. **Rate limiting обязателен** на всех трёх эндпоинтах — защита от флуда заявками.

7. **События пишет только сервер** через `lib/events.ts`. Источник не управляет журналом.

8. **Тестовый запрос Tilda не создаёт лид.** Проверка `test` в теле до парсинга.

---

## Связи с другими модулями

- **`.docs/modules/assignment.md`** — `assignLead(leadId)` вызывается после коммита приёма. Режим (ручной/round-robin) — из настроек компании.
- **`.docs/modules/notifications.md`** — `notifyNewLead(leadId)` после коммита: SSE в интерфейс + Telegram ответственному.
- **`.docs/modules/integrations.md`** — генерация и управление API-ключами, переключение режима Яндекса, инструкции и URL вебхуков в UI админки.
- **`.docs/modules/leads.md`** — отображение принятого лида в списке и карточке; экранирование `customFields` при выводе.
- **`.docs/database.md`** — модели `Lead`, `ApiKey`, `Event`; транзакция приёма; индексы поиска.
