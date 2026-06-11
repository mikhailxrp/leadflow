# Модуль: Авторизация и доступ (auth)

> Спецификация входа, сессий, защиты роутов, rate limiting и первичного сидирования.
> Связанные файлы: `.docs/database.md` (модели `Company`, `User`), `.docs/modules/admin-users.md` (создание менеджеров), `CLAUDE.md` (раздел proxy.ts, ENV).

---

## Содержание

1. [Цели модуля](#цели-модуля)
2. [Архитектурные решения](#архитектурные-решения)
3. [Первичное сидирование](#первичное-сидирование)
4. [Логин](#логин)
5. [Логаут](#логаут)
6. [Защита роутов (proxy.ts)](#защита-роутов-proxyts)
7. [Rate limiting](#rate-limiting)
8. [API-эндпоинты](#api-эндпоинты)
9. [Файлы, которые создаются](#файлы-которые-создаются)
10. [Серверные правила безопасности](#серверные-правила-безопасности)
11. [Связи с другими модулями](#связи-с-другими-модулями)

---

## Цели модуля

После завершения этого модуля:

- Первый администратор и компания создаются сидером при первом деплое
- Пользователь (админ или менеджер) может войти по email + паролю
- Сессия живёт заданное время, роль пишется в сессию
- Защищённые роуты (`/dashboard`, `/leads`, `/pipeline`, `/admin/*`) недоступны без сессии
- Админская зона (`/admin/*`) доступна только роли ADMIN
- Заблокированные менеджеры не могут войти
- Публичные эндпоинты защищены rate limiting
- `companyId` пользователя доступен в сессии — основа изоляции тенантов

**Не входит в модуль:**

- **Самостоятельная регистрация** — её нет (Boxed-модель). Менеджеров создаёт админ → `.docs/modules/admin-users.md`.
- **Восстановление пароля по email** — out of scope MVP. Пароль менеджеру задаёт/меняет админ в UI. (Закладка на email-reset — в будущих версиях.)
- **OAuth, 2FA** — out of scope.
- UI dashboard, список лидов, воронка — другие модули.

---

## Архитектурные решения

### 1. NextAuth.js v5, credentials provider

Один credentials-провайдер (`credentials`). В отличие от Boxed-проекта без SaaS-задела, у нас админ и менеджеры — **одна таблица `User`**, различаются полем `role`. Причина: оба принадлежат одной компании; для будущего SaaS тенант владеет всеми своими пользователями.

В session-callback пишутся `session.user.role` (`'ADMIN' | 'MANAGER'`) и `session.user.companyId`. По `role` `proxy.ts` решает доступ к админке; по `companyId` все запросы изолируют данные тенанта.

**Почему v5, а не v4:**

- Next.js 16 + App Router официально поддерживается в v5
- v5 даёт функцию `auth()` — единообразно в Server Components, Route Handlers и `proxy.ts`
- v5 экспортирует `handlers`, `signIn`, `signOut`, `auth` из единой `lib/auth.ts`

### 2. JWT-стратегия сессии

```typescript
// lib/auth.ts (фрагмент)
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60, // 24 часа
}
```

JWT (а не database session): не требует таблицы `Session`, роль и `companyId` кладутся в токен и доступны без запроса к БД на каждый чек.

### 3. Что кладём в токен и сессию

```typescript
// callbacks (фрагмент lib/auth.ts)
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = user.role;
      token.companyId = user.companyId;
    }
    return token;
  },
  async session({ session, token }) {
    session.user.id = token.sub!;
    session.user.role = token.role as "ADMIN" | "MANAGER";
    session.user.companyId = token.companyId as string;
    return session;
  },
}
```

Тип `Session` расширяется в `types/next-auth.d.ts`.

### 4. Пароли

bcrypt-хэш в `User.passwordHash`. Plain-пароль задаётся админом при создании менеджера (или сидером для первого админа из ENV) и в БД не хранится. Утилиты — в `lib/password.ts`.

### 5. Проверка блокировки

`User.isBlocked` проверяется **на сервере в `authorize()`** при каждом логине. Заблокированный менеджер не входит, даже если знает пароль. Клиентскую проверку не используем — её можно обойти.

---

## Первичное сидирование

Так как самостоятельной регистрации нет, первая компания и первый админ создаются сидером (`prisma/seed.ts`) при первом деплое.

**Флоу:**

1. Сидер проверяет `if (await prisma.company.count() > 0) return;` — идемпотентность (INIT-04)
2. Создаёт `Company` из ENV (`COMPANY_INITIAL_NAME`, `LICENSE_KEY`) с дефолтными `settings`
3. Создаёт `User` с `role = ADMIN` из ENV (`ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD` → bcrypt)
4. Создаёт 5 дефолтных `PipelineStage` для компании (INIT-03)

Детали — `.docs/database.md` → раздел «Сидеры».

После первого деплоя ENV `ADMIN_INITIAL_*` и `COMPANY_INITIAL_NAME` удаляются с сервера. Дальнейшие менеджеры — через UI админки.

---

## Логин

### Флоу со стороны пользователя

1. Открывает `/login`
2. Вводит email + пароль
3. При успехе — редирект: ADMIN → `/dashboard` (есть доступ и к `/admin/*`), MANAGER → `/dashboard`
4. При ошибке — сообщение «Неверный email или пароль» (без уточнения, что именно неверно)

### Флоу со стороны сервера

```typescript
// lib/auth.ts → authorize() (фрагмент)
async authorize(credentials) {
  const { email, password } = loginSchema.parse(credentials);
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return null;                          // нет пользователя
  if (user.isBlocked) return null;                 // заблокирован
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return null;                            // неверный пароль

  // Возвращаем минимум — попадёт в jwt callback
  return { id: user.id, role: user.role, companyId: user.companyId, name: user.name };
}
```

После успешного входа — событие `LOGIN` в `events` (через `lib/events.ts`).

---

## Логаут

`signOut()` из NextAuth v5. Чистит сессию (JWT-cookie), редиректит на `/login`. Кнопка — в сайдбаре (нижний блок с аватаром).

---

## Защита роутов (proxy.ts)

Полный код — в `CLAUDE.md` → раздел «Защита роутов». Кратко:

- `/dashboard`, `/leads`, `/pipeline` — любой авторизованный
- `/admin/*` — только `role === "ADMIN"`, иначе редирект на `/dashboard`
- Без сессии — редирект на `/login`

`matcher` ограничивает proxy только защищёнными путями (не трогает публичные и статику).

---

## Rate limiting

### Эндпоинты, требующие rate limiting

| Эндпоинт | Лимит | Ключ |
| --- | --- | --- |
| `POST /api/auth/[...nextauth]` (логин) | 10 / мин | IP |
| `POST /api/webhooks/*` (приём лидов) | см. `.docs/modules/leads-intake.md` | API-ключ / IP |

### Реализация

In-memory лимитер для MVP (`lib/rateLimit.ts`) — одна инсталляция, один процесс PM2. Если в будущем горизонтальное масштабирование — заменить на Redis/upstash.

```typescript
// lib/rateLimit.ts — концепт
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}
```

### Получение IP

За Nginx реальный IP — в заголовке `x-forwarded-for` (Nginx настраивается на проксирование). Берём первый IP из списка.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Rate limit |
| --- | --- | --- | --- | --- |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth v5 handler (signIn/signOut/session/callback) | Public | 10 / мин на IP (логин) |

Отдельных кастомных auth-эндпоинтов (`register`, `reset`) в MVP нет — их роль закрыта сидером и админкой.

### Спецификация логина

Логин идёт через стандартный механизм NextAuth (`signIn("credentials", { email, password })`). Ответы:

- **Успех** — установка сессионной cookie, редирект на `callbackUrl` или `/dashboard`
- **Ошибка** — `null` из `authorize()` → NextAuth возвращает ошибку `CredentialsSignin`, UI показывает «Неверный email или пароль»
- **429** — при превышении лимита: `{ "error": "RATE_LIMIT_EXCEEDED" }`

---

## Файлы, которые создаются

```
app/
├── (auth)/
│   └── login/page.tsx                    # Server Component, страница входа
└── api/
    └── auth/
        └── [...nextauth]/route.ts        # NextAuth v5 handler (GET/POST из { handlers })

components/
└── auth/
    └── LoginForm.tsx                     # Client Component, форма входа

lib/
├── auth.ts                               # NextAuth v5 конфиг + { handlers, signIn, signOut, auth }
├── password.ts                           # hashPassword(plain), comparePassword(plain, hash)
├── rateLimit.ts                          # in-memory rate limiter
├── events.ts                             # writeEvent() — используется для LOGIN
└── validations/
    └── auth.ts                           # Zod: loginSchema

types/
└── next-auth.d.ts                        # Расширение Session: role, companyId

prisma/
└── seed.ts                               # Первичное сидирование (компания + админ + этапы)

proxy.ts                                  # Защита /dashboard, /leads, /pipeline, /admin/*
```

---

## Серверные правила безопасности

1. **Никогда не возвращать клиенту:** plain-пароль, bcrypt-хэш, `passwordHash` в любых User-ответах. В логах ошибок — только email.

2. **Всегда хэшировать пароль перед записью:**

   ```typescript
   // Запрет:
   await prisma.user.create({ data: { passwordHash: "plain123" } });
   // Только так:
   const hash = await hashPassword(plain); // bcrypt, 10 раундов
   await prisma.user.create({ data: { passwordHash: hash } });
   ```

3. **Email — всегда lowercase + trim** перед записью и поиском. Иначе `Ivan@Mail.ru` и `ivan@mail.ru` дадут две записи / провал входа.

4. **Проверка `isBlocked` ВСЕГДА на сервере** в `authorize()`.

5. **`companyId` берётся только из сессии, никогда из тела запроса.** Клиент не может прислать чужой `companyId`, чтобы получить доступ к данным другого тенанта.

6. **HTTPS обязателен в проде.** Cookie `secure: true` в prod. NextAuth определяет по `AUTH_URL`.

7. **ENV `ADMIN_INITIAL_*` и `COMPANY_INITIAL_NAME`** — только для сидера, один раз. После первого деплоя удалить с сервера. Защита в сидере: `if (company.count() > 0) return;`.

8. **`LICENSE_KEY`** проверяется при старте приложения (`lib/license.ts`). Несовпадение — приложение не стартует. К auth прямого отношения не имеет, но проверяется до запуска любых роутов.

---

## Связи с другими модулями

- **`.docs/modules/admin-users.md`** — создание, блокировка, удаление менеджеров. Здесь — только вход.
- **`.docs/modules/leads-intake.md`** — webhook-эндпоинты приёма лидов аутентифицируются API-ключом, не сессией (отдельный механизм).
- **`.docs/database.md`** — модели `Company`, `User`, раздел «Сидеры».
- **`CLAUDE.md`** — полный код `proxy.ts`, список ENV, правило изоляции по `companyId`.
