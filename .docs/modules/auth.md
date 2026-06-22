# Модуль: Авторизация, приём приглашения и доступ (auth)

> Спецификация приёма приглашения, входа, сессий, восстановления пароля, защиты роутов и rate limiting для пользователей компаний. Создание самой компании — не здесь, см. `.docs/modules/platform-admin.md`.
> Связанные файлы: `.docs/database.md` (модели `Company`, `User`, `CompanyInvite`), `.docs/modules/platform-admin.md` (создание компании и приглашения), `.docs/modules/admin-users.md` (создание последующих менеджеров), `CLAUDE.md` (раздел proxy.ts, ENV).

---

## Содержание

1. Цели модуля
2. Архитектурные решения
3. Приём приглашения
4. Логин
5. Восстановление пароля
6. Логаут
7. Защита роутов (proxy.ts)
8. Rate limiting
9. API-эндпоинты
10. Файлы, которые создаются
11. Серверные правила безопасности
12. Связи с другими модулями

---

## Цели модуля

После завершения этого модуля:

- Клиент по ссылке-приглашению от платформенного администратора сам задаёт пароль и имя, становится администратором своей компании
- Пользователь может войти по email + паролю, выйти
- Пользователь может восстановить забытый пароль самостоятельно, по email
- Сессия несёт `companyId` и одну из трёх ролей (`MANAGER`/`HEAD`/`ADMIN`)
- Вход отклоняется, если пользователь заблокирован **или** если заблокирована его компания (два разных, независимых флага)
- Защищённые роуты недоступны без сессии; уровень доступа внутри компании определяется иерархией ролей, не отдельным перечислением

**Не входит в модуль:**

- Создание самой компании и первого приглашения → `.docs/modules/platform-admin.md`
- Создание последующих менеджеров (после первого администратора) → `.docs/modules/admin-users.md`
- Платформенная сессия (`kind: "platform"`), вход платформенного администратора → `.docs/modules/platform-admin.md`
- OAuth, 2FA — out of scope

---

## Архитектурные решения

### 1. Приём приглашения — не самостоятельная регистрация

Компанию и приглашение создаёт платформенный администратор (`.docs/modules/platform-admin.md`). Этот модуль отвечает только за то, что происходит **после**: клиент по ссылке задаёт себе пароль. Никакой публичной формы «зарегистрировать компанию» в продукте нет.

### 2. NextAuth.js v5, credentials provider, сессия `kind: "company"`

```typescript
type CompanySession = {
  kind: "company";
  user: { id: string; companyId: string; role: UserRole; impersonatedByPlatformAdminId?: string };
};
```

JWT-сессия (`maxAge: 24 * 60 * 60`). `impersonatedByPlatformAdminId` присутствует только если сессия создана через impersonation (`.docs/modules/platform-admin.md`) — обычный вход никогда не выставляет это поле.

### 3. Пароли — bcrypt, без изменений в механике

Хэш в `User.passwordHash`. Кто задаёт первый пароль администратора компании — сам клиент, через приём приглашения (не платформенный администратор, не сидер).

### 4. Двойная проверка блокировки при входе

```typescript
// lib/auth.ts → authorize() — концепт
async function authorize({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() }, include: { company: true } });
  if (!user) return null;
  if (!(await bcrypt.compare(password, user.passwordHash))) return null;
  if (user.isBlocked) throw new AuthError("USER_BLOCKED");
  if (user.company.isBlocked) throw new AuthError("COMPANY_BLOCKED");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeEvent(user.companyId, "LOGIN", {}, user.id);

  return { kind: "company", user: { id: user.id, companyId: user.companyId, role: user.role } };
}
```

Два разных флага (`User.isBlocked`, `Company.isBlocked`) — два разных сообщения об ошибке на клиенте («Ваш аккаунт заблокирован» / «Компания временно недоступна, обратитесь в поддержку»), хотя оба приводят к отказу входа.

---

## Приём приглашения

### Флоу со стороны пользователя

```
1. Открывает /accept-invite?token=...
2. Если токен невалиден/просрочен/уже использован → "Ссылка недействительна, запросите новую у платформенного администратора"
3. Вводит: имя, пароль
4. Сервер создаёт пользователя с ролью ADMIN, помечает приглашение использованным
5. Автоматический вход, редирект на /today
```

### Флоу со стороны сервера

```typescript
// app/api/auth/accept-invite/route.ts — концепт
export async function POST(req: Request) {
  const { token, name, password } = acceptInviteSchema.parse(await req.json());

  const user = await prisma.$transaction(async (tx) => {
    const invite = await tx.companyInvite.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw new ValidationError("INVITE_INVALID");
    }

    const exists = await tx.user.findUnique({ where: { email: invite.email } });
    if (exists) throw new ValidationError("EMAIL_EXISTS");

    const user = await tx.user.create({
      data: { companyId: invite.companyId, email: invite.email, passwordHash: await hashPassword(password), name, role: "ADMIN" },
    });
    await tx.companyInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    return user;
  });

  // выставить сессию (signIn под капотом) и вернуть редирект на /today
}
```

### Что проверяется

| Проверка | Реакция при провале |
| --- | --- |
| Токен существует, не использован, не просрочен | `400 INVITE_INVALID` |
| Email из приглашения ещё не занят (на случай повторного клика по той же ссылке после ручной правки) | `400 EMAIL_EXISTS` |
| Пароль ≥ 8 символов | `400 VALIDATION_ERROR` |

Первый пользователь компании всегда получает роль `ADMIN` — приглашение не позволяет создать сразу `MANAGER`/`HEAD`, остальных сотрудников администратор добавляет сам после входа (`.docs/modules/admin-users.md`).

---

## Логин

Email + пароль → `signIn("credentials", ...)` → редирект на `/today`. Ошибка — «Неверный email или пароль» без уточнения, что именно неверно, **кроме** случаев блокировки (см. архитектурное решение 4 — здесь сообщение осознанно более конкретное, потому что это не вопрос подбора пароля). Событие `LOGIN` в журнал, `User.lastLoginAt` обновляется.

---

## Восстановление пароля

### Флоу

```
1. /login → «Забыли пароль?» → /forgot-password
2. Вводит email → POST /api/auth/forgot-password
3. Сервер (независимо от существования email — не раскрывать наличие аккаунта):
   - генерирует одноразовый токен с TTL (1 час)
   - если пользователь существует и не заблокирован — отправляет письмо со ссылкой /reset-password?token=...
   - отвечает одинаковым сообщением в обоих случаях
4. Пользователь открывает ссылку, вводит новый пароль
5. POST /api/auth/reset-password { token, password } → токен одноразовый, инвалидируется
6. Редирект на /login с сообщением об успехе
```

Хранение токена — лёгкая структура (отдельная таблица или in-memory с TTL, аналогично решению для приглашений — решение по конкретному хранилищу не навязывается схемой заранее).

**Платформенный администратор не участвует в этом флоу** — у него нет отдельной возможности «сбросить пароль за клиента» помимо обычного `forgot-password`. Если клиенту нужна помощь прямо сейчас — для этого есть impersonation (`.docs/modules/platform-admin.md`), не обход пароля.

---

## Логаут — без изменений

---

## Защита роутов (proxy.ts)

Полный код — `CLAUDE.md` → «Защита роутов». Кратко: `/login`, `/accept-invite`, `/forgot-password`, `/reset-password` — публичные; `/today`, `/leads`, `/pipeline` — любая сессия `kind: "company"`; `/control`, `/reports` — `hasMinRole(role, "HEAD")`; `/admin/*` — `hasMinRole(role, "ADMIN")`.

---

## Rate limiting

| Эндпоинт | Лимит | Ключ |
| --- | --- | --- |
| `POST /api/auth/[...nextauth]` (логин) | 10 / мин | IP |
| `POST /api/auth/accept-invite` | 10 / час | IP — приглашений мало, но защита от перебора токенов не лишняя |
| `POST /api/auth/forgot-password` | 5 / час | IP + email |

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Rate limit |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/accept-invite` | Приём приглашения, установка пароля | Public (по токену) | 10 / час на IP |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth v5 handler | Public | 10 / мин на IP (логин) |
| POST | `/api/auth/forgot-password` | Запрос письма восстановления | Public | 5 / час на IP+email |
| POST | `/api/auth/reset-password` | Установка нового пароля по токену | Public (по токену) | — |

### `POST /api/auth/accept-invite`

**Request:** `{ "token": "...", "name": "Иван", "password": "..." }`
**Response 200:** `{ "success": true }` + установленная сессия
**Response 400:** `{ "success": false, "error": "INVITE_INVALID" | "EMAIL_EXISTS" | "VALIDATION_ERROR" }`

---

## Файлы, которые создаются

```
app/
├── (public)/
│   ├── login/page.tsx
│   ├── accept-invite/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
└── api/
    └── auth/
        ├── [...nextauth]/route.ts
        ├── accept-invite/route.ts
        ├── forgot-password/route.ts
        └── reset-password/route.ts

components/
└── auth/
    ├── AcceptInviteForm.tsx
    ├── LoginForm.tsx
    ├── ForgotPasswordForm.tsx
    └── ResetPasswordForm.tsx

lib/
├── auth.ts
├── password.ts
├── rateLimit.ts
├── events.ts
└── validations/
    └── auth.ts          # acceptInviteSchema, forgotPasswordSchema, resetPasswordSchema

constants/
├── roles.ts              # ROLE_RANK, hasMinRole
├── defaultStages.ts
└── defaultLossReasons.ts

types/
└── next-auth.d.ts

proxy.ts
```

---

## Серверные правила безопасности

1. **Не возвращать клиенту хэши/пароли.**
2. **Email lowercase + trim перед любым сравнением/сохранением.**
3. **Проверка `User.isBlocked` И `Company.isBlocked` — обе на сервере, в `authorize()`.**
4. **Восстановление пароля не подтверждает существование email.**
5. **Токены (приглашение, восстановление пароля) — одноразовые, с TTL.**
6. **Первый пользователь компании создаётся только через `accept-invite` с ролью `ADMIN`** — не существует пути создать первого пользователя компании с ролью `MANAGER`/`HEAD` напрямую.
7. **`companyId` при приёме приглашения берётся из `CompanyInvite`, не из тела запроса.**
8. **HTTPS, `secure` cookie в проде.**

---

## Связи с другими модулями

- **`.docs/modules/platform-admin.md`** — создаёт компанию и `CompanyInvite`, которые принимает этот модуль.
- **`.docs/modules/admin-users.md`** — создание менеджеров и руководителей после первого администратора.
- **`.docs/modules/leads-intake.md`** — вебхуки аутентифицируются API-ключом, не сессией; не зависят от `Company.isBlocked`.
- **`.docs/database.md`** — модели `User`, `Company`, `CompanyInvite`; `constants/roles.ts` (`ROLE_RANK`/`hasMinRole`).
- **`CLAUDE.md`** — полный код `proxy.ts`, разделение типов сессии.
