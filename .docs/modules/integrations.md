# Модуль: Интеграции (integrations)

> Спецификация логики подключения внешних источников лидов: Tilda, WordPress, Яндекс Директ, универсальный webhook. Только для роли ADMIN.
> Связанные файлы: `.docs/database.md` (модели `ApiKey`, `Company.settings`), `.docs/modules/leads-intake.md` (приём лидов), `CLAUDE.md` (ENV).

---

## Содержание

1. [Цели модуля](#цели-модуля)
2. [Откуда берётся URL вебхука](#откуда-берётся-url-вебхука)
3. [Tilda](#tilda)
4. [WordPress](#wordpress)
5. [Яндекс Директ](#яндекс-директ)
6. [Универсальный Webhook — API-ключи](#универсальный-webhook--api-ключи)
7. [API-эндпоинты](#api-эндпоинты)
8. [Файлы, которые создаются](#файлы-которые-создаются)
9. [Серверные правила безопасности](#серверные-правила-безопасности)
10. [Связи с другими модулями](#связи-с-другими-модулями)

---

## Цели модуля

После завершения этого модуля:

- Пользователь видит URL вебхука для каждого источника и может его скопировать
- Tilda и WordPress отправляют лиды на этот URL — CRM принимает их
- Яндекс Директ подключается через OAuth — CRM получает данные о рекламе
- Для любого другого сайта генерируется API-ключ — лиды принимаются по ключу

---

## Откуда берётся URL вебхука

URL вебхука — это адрес нашего сервера, куда внешние сервисы отправляют данные о заявках.

**Как формируется в SaaS:**

В SaaS много компаний на одном домене. Чтобы сервер знал, для какой компании пришёл лид — `companyId` включается прямо в URL:

```
APP_URL + "/api/webhooks/tilda/" + companyId
APP_URL + "/api/webhooks/wordpress/" + companyId

Пример:
  https://app.leadcrm.ru/api/webhooks/tilda/clxxx123
  https://app.leadcrm.ru/api/webhooks/wordpress/clxxx123
```

Каждая компания получает свой уникальный URL с её `companyId`. Сервер читает `companyId` из пути и знает куда класть лид.

**Как URL попадает в карточку:**

```typescript
// app/api/settings/webhook-urls/route.ts
GET /api/settings/webhook-urls
→ сервер берёт companyId из сессии текущего пользователя
→ склеивает APP_URL + путь + companyId
→ возвращает { tilda, wordpress }
→ карточки показывают готовые URL
→ кнопка «Скопировать» копирует в буфер
```

Никаких хардкодов URL на клиенте нет — всё через сервер.

> **Универсальный Webhook менять не нужно** — API-ключ уже несёт
> `companyId` внутри себя (через `ApiKey.companyId` в БД).

---

## Tilda

### Что делает пользователь (3 шага)

```
1. Открывает страницу Интеграции в CRM
2. Видит карточку Tilda → копирует URL вебхука
3. Идёт в Tilda → Настройки сайта → Формы → Webhook → вставляет URL → сохраняет
```

После этого каждая отправка формы на сайте Tilda автоматически создаёт лид в CRM.

### Тестовый запрос Tilda

При сохранении вебхука Tilda **автоматически** шлёт тестовый POST с полем `test=test`. Если наш сервер не ответит `200 OK` — Tilda не сохранит вебхук.

```typescript
// app/api/webhooks/tilda/[companyId]/route.ts
export async function POST(
  req: Request,
  { params }: { params: { companyId: string } }
) {
  const { companyId } = params;
  const body = await req.formData(); // Tilda шлёт form-urlencoded

  // Проверяем что компания существует
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  // Тестовый запрос Tilda — ответить 200 и выйти
  if (body.get("test") === "test") {
    return Response.json({ success: true });
  }

  // Обычный лид
  await createLead(Object.fromEntries(body), "TILDA", companyId);
  return Response.json({ success: true });
}
```

### Статус «Подключено»

Определяется автоматически: есть хотя бы один лид с `source = TILDA` у компании → бейдж «Подключено» (зелёный). Иначе — «Не настроено» (серый). Никакой ручной активации нет.

---

## WordPress

### Что делает пользователь (3 шага)

```
1. Устанавливает на сайт плагин: Contact Form 7, WPForms или Gravity Forms
2. Открывает страницу Интеграции в CRM → копирует URL вебхука для WordPress
3. В настройках плагина указывает этот URL как адрес вебхука
```

**Конкретно по плагинам:**
- **Contact Form 7** → нужен доп. плагин «CF7 to Webhook» → там вставить URL
- **WPForms** → Настройки формы → Уведомления → Webhook → вставить URL
- **Gravity Forms** → Add-Ons → Webhooks → вставить URL

### Как работает

WordPress-плагин шлёт `POST` с данными формы на наш URL. Формат зависит от плагина — у одних JSON, у других form-urlencoded. Наш сервер принимает оба формата (см. `leads-intake` → `parseBody`).

```typescript
// app/api/webhooks/wordpress/[companyId]/route.ts
export async function POST(
  req: Request,
  { params }: { params: { companyId: string } }
) {
  const { companyId } = params;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  const raw = contentType.includes("json")
    ? await req.json()
    : Object.fromEntries(await req.formData());

  await createLead(raw, "WORDPRESS", companyId);
  return Response.json({ success: true });
}
```

### Статус «Подключено»

Аналогично Tilda — есть лид с `source = WORDPRESS` → «Подключено».

---

## Яндекс Директ

### Два режима

**Режим UTM (по умолчанию) — ничего делать не нужно.**
Лиды с Яндекса приходят через обычные формы (Tilda/WordPress/Webhook) с UTM-метками в URL. CRM сохраняет `utm_source`, `utm_campaign` и т.д. автоматически. Никаких дополнительных настроек.

**Режим Полный API — нужна авторизация в Яндексе.**
Даёт дополнительные данные: название кампании, группа объявлений, ключевая фраза, устройство, регион.

### Что нужно заранее настроить (делает поставщик — один раз для всей платформы)

В SaaS регистрируется **одно приложение** в Яндексе для всех клиентов:

```
Яндекс OAuth → Мои приложения → Создать приложение
  → Название: LeadCRM
  → Права: Яндекс.Директ (чтение)
  → Redirect URI: https://app.leadcrm.ru/api/integrations/yandex/callback

Получаем (кладём в .env платформы — один раз):
  YANDEX_CLIENT_ID=...
  YANDEX_CLIENT_SECRET=...
```

Каждый клиент проходит OAuth через это же приложение и получает **свой** токен, который сохраняется в его `Company.settings`. Клиенты не видят токены друг друга.

### Как работает авторизация OAuth (Полный API)

```
**Шаг 0 — делает поставщик один раз перед деплоем:**
Зарегистрировать приложение на https://oauth.yandex.ru/
  → Права: Яндекс.Директ (чтение)
  → Redirect URI: https://<домен>/api/integrations/yandex/callback
  → Получить YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET
  → Положить в .env на сервер

Без этого шага кнопка «Подключить кабинет» работать не будет.
Наша CRM никаких данных Яндексу не отправляет —
это Яндекс выдаёт нам доступ после подтверждения пользователя.

Шаг 1: Пользователь нажимает кнопку в CRM
  → CRM открывает страницу Яндекса в новой вкладке:
    https://oauth.yandex.ru/authorize
      ?response_type=code
      &client_id=<наш APP_ID в Яндексе>
      &redirect_uri=<наш домен>/api/integrations/yandex/callback
      &scope=direct:read
      &state=<companyId>_<случайная_строка>  ← companyId + защита от CSRF

Шаг 2: Пользователь видит страницу Яндекса
  → Входит в свой Яндекс-аккаунт (если не вошёл)
  → Яндекс спрашивает: «CRM хочет доступ к вашему Директу — разрешить?»
  → Пользователь нажимает «Разрешить»

Шаг 3: Яндекс редиректит обратно в CRM
  → https://<наш домен>/api/integrations/yandex/callback?code=XXXX&state=<companyId>_<случайная_строка>
  → Наш сервер извлекает companyId из state
  → Проверяет случайную строку (защита от CSRF)

Шаг 4: Сервер обменивает code на токен (это происходит автоматически)
  → POST https://oauth.yandex.ru/token { code, client_id, client_secret }
  → Получает access_token + refresh_token
  → Сохраняет токены в Company.settings НУЖНОЙ компании (по companyId из state)

Шаг 5: Карточка Яндекса обновляется
  → Бейдж «Подключено»
  → Кнопка меняется на «Отключить кабинет»
```

**Почему `companyId` в `state`, а не в `redirect_uri`:** Яндекс требует что `redirect_uri` точно совпадал с зарегистрированным. Менять его динамически нельзя. Поэтому `companyId` передаём через `state` — это стандартная практика OAuth.

### Хранение токена

```typescript
// Токены сохраняются в Company.settings (JSONB)
// НЕ отдаются клиенту никогда

type CompanySettings = {
  ...
  yandexMode: "UTM" | "FULL";
  yandexAccessToken?: string;   // зашифрован перед записью
  yandexRefreshToken?: string;  // для обновления когда access_token истечёт
  yandexTokenExpiresAt?: string;
};
```

### Обновление токена (refresh)

Access_token Яндекса живёт 1 год. Когда истекает — сервер автоматически обновляет его через refresh_token. Пользователь ничего не замечает.

```
Запрос к API Яндекса → 401 Unauthorized
  → сервер делает refresh: POST oauth.yandex.ru/token { refresh_token }
  → получает новый access_token → сохраняет → повторяет запрос
  → если refresh тоже не работает → бейдж «Не настроено», пользователю нужно переподключить
```

---

## Универсальный Webhook — API-ключи

Для любого сайта или формы где нет готовой интеграции.

### Откуда берётся ключ

Ключ **генерируется на нашем сервере** кнопкой «+ Создать новый ключ»:

```typescript
// lib/intake/apiKey.ts
import { randomBytes, createHash } from "crypto";

// Генерация: криптостойкий случайный ключ
function generateApiKey(): string {
  return "sk_live_" + randomBytes(24).toString("base64url"); // 32 символа
}

// Хэширование: в БД хранится только хэш, не сам ключ
function hashKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

// При создании:
const plain = generateApiKey();              // sk_live_AbC123...
const keyHash = hashKey(plain);             // a3f9bc...
await prisma.apiKey.create({
  data: { companyId, name, keyHash, sourceLabel }
});
return plain; // отдаём пользователю ОДИН РАЗ
```

### Что делает пользователь (3 шага)

```
1. Нажимает «+ Создать новый ключ»
   → Вводит: Название (например «Основной лендинг»)
             Источник (например «landing-main»)
   → Нажимает «Создать»

2. CRM показывает ключ ОДИН РАЗ:
   sk_live_AbC123...
   [Скопировать]  ⚠️ Сохраните — больше не покажем

3. Передаёт ключ разработчику своего сайта.
   Разработчик настраивает форму отправлять POST на:
   https://<домен>/api/webhooks/leads?key=sk_live_AbC123...
```

### Как сервер проверяет ключ при приёме

```typescript
// app/api/webhooks/leads/route.ts
export async function POST(req: Request) {
  const key = req.nextUrl.searchParams.get("key");

  if (!key) return Response.json({ error: "MISSING_KEY" }, { status: 401 });

  // Хэшируем пришедший ключ и ищем в БД
  const keyHash = hashKey(key);
  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, company: { ... } }
  });

  if (!apiKey) return Response.json({ error: "INVALID_KEY" }, { status: 401 });

  // Ключ валиден — принимаем лид
  await createLead(await req.json(), "API", apiKey.sourceLabel);
  return Response.json({ success: true });
}
```

### Почему ключ показывается только один раз

В БД хранится хэш (`a3f9bc...`), а не сам ключ (`sk_live_AbC123...`). Восстановить ключ из хэша математически невозможно. Если пользователь потерял — создаёт новый, старый удаляет.

### Иконка 👁 в таблице

Показывает **детали ключа** (не сам ключ — его нет в БД):

```
Название: Основной лендинг
Источник: landing-main
Создан: 12.10.2023
URL для использования: https://<домен>/api/webhooks/leads?source=landing-main
[Скопировать URL]
```

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth |
|---|---|---|---|
| GET | `/api/settings/webhook-urls` | URL вебхуков с companyId текущей компании | Session / ADMIN |
| GET | `/api/api-keys` | Список ключей (без plain) | Session / ADMIN |
| POST | `/api/api-keys` | Создать ключ — вернуть plain один раз | Session / ADMIN |
| DELETE | `/api/api-keys/:id` | Удалить ключ | Session / ADMIN |
| GET | `/api/integrations/yandex/auth-url` | URL для OAuth с companyId в state | Session / ADMIN |
| GET | `/api/integrations/yandex/callback` | Callback: code + state → токен → нужная компания | Public |
| DELETE | `/api/integrations/yandex` | Отключить кабинет Яндекса | Session / ADMIN |
| POST | `/api/webhooks/tilda/[companyId]` | Приём лидов Tilda для конкретной компании | Public |
| POST | `/api/webhooks/wordpress/[companyId]` | Приём лидов WordPress для конкретной компании | Public |
| POST | `/api/webhooks/leads` | Приём лидов (по API-ключу, companyId из ключа) | API-ключ |

---

## Файлы, которые создаются

```
app/
├── (admin)/admin/integrations/page.tsx     # Страница интеграций
└── api/
    ├── settings/webhook-urls/route.ts      # GET: URL вебхуков из APP_URL
    ├── api-keys/
    │   ├── route.ts                        # GET, POST
    │   └── [id]/route.ts                   # DELETE
    ├── integrations/yandex/
    │   ├── auth-url/route.ts               # GET: ссылка на OAuth Яндекса
    │   ├── callback/route.ts               # GET: code → токен → сохранить
    │   └── route.ts                        # DELETE: отключить
    └── webhooks/
        ├── tilda/[companyId]/route.ts      # POST: приём + тестовый запрос
        ├── wordpress/[companyId]/route.ts  # POST: приём (json + form-urlencoded)
        └── leads/route.ts                  # POST: приём по API-ключу (companyId из ключа)

lib/
└── intake/
    └── apiKey.ts                           # generateApiKey(), hashKey()

lib/integrations/
    └── yandex.ts                           # OAuth: обмен code→токен, refresh, API-запросы

components/admin/integrations/
    ├── TildaCard.tsx
    ├── WordpressCard.tsx
    ├── YandexCard.tsx                      # Client: радио + OAuth-кнопка
    ├── ApiKeysCard.tsx
    ├── CreateKeyModal.tsx                  # Client: создание + показ plain один раз
    └── KeyDetailsModal.tsx                 # Client: детали ключа (метаданные + URL)

lib/validations/
    └── apiKeys.ts                          # Zod: createKeySchema
```

---

## Серверные правила безопасности

1. **URL вебхуков только из ENV** (`APP_URL`). Никаких хардкодов домена на клиенте.
2. **Plain-ключ — один раз**. В БД только `keyHash`. Восстановить невозможно.
3. **OAuth-токены Яндекса — только сервер**. Шифруются перед записью в `Company.settings`. Клиент никогда их не видит.
4. **`YANDEX_CLIENT_SECRET` — только в `.env`**. Не в коде, не на клиенте.
5. **Callback Яндекса — проверять `state`**. При старте OAuth генерировать случайный `state`, сохранять в сессии, проверять при callback. Защита от CSRF-атаки на OAuth.
6. **Все операции — только ADMIN**. Менеджер не управляет интеграциями.
7. **`companyId` из сессии**. Ключи и токены изолированы по компании.

---

## Связи с другими модулями

- **`.docs/modules/leads-intake.md`** — реальный приём лидов по этим вебхукам.
- **`.docs/modules/app-settings.md`** — `yandexMode` хранится в `Company.settings`.
- **`.docs/database.md`** — модель `ApiKey`, поля `yandexAccessToken` в `Company.settings`.
- **`CLAUDE.md`** — ENV: `APP_URL`, `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`.
