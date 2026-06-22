# Модуль: Платформенный администратор (platform-admin)

> Спецификация платформенного уровня: отдельная от компаний сущность, которая создаёт компании, блокирует/разблокирует их, видит активность и входит внутрь для поддержки через impersonation. Новый модуль — заменяет упразднённый `billing.md`.
> Связанные файлы: `.docs/database.md` (`PlatformAdmin`, `CompanyInvite`, `Company.isBlocked`, `Event.impersonatedByPlatformAdminId`), `.docs/modules/auth.md` (приём приглашения), `CLAUDE.md` (раздел proxy.ts, разделение сессий).

---

## Содержание

1. Цели модуля
2. Архитектурные решения
3. Bootstrap первого платформенного администратора
4. Вход платформенного администратора — отдельная сессия
5. Создание компании и приглашение
6. Блокировка и разблокировка компании
7. Вход от имени компании (impersonation)
8. Активность компаний
9. Управление платформенными администраторами
10. API-эндпоинты
11. Файлы, которые создаются
12. Серверные правила безопасности
13. Связи с другими модулями

---

## Цели модуля

После завершения этого модуля:

- Существует способ создать первого платформенного администратора без публичной регистрации
- Платформенный администратор создаёт компании и приглашает их первого администратора по ссылке
- Платформенный администратор может заблокировать/разблокировать любую компанию без удаления данных
- Платформенный администратор может войти «как» любой пользователь любой компании для поддержки, без знания пароля
- Каждый такой вход и каждое действие внутри него — прозрачно зафиксированы
- Платформенный администратор видит активность компаний (не лиды как рабочий процесс)
- Может создавать других платформенных администраторов

**Не входит в модуль:**

- Работа с лидами как таковая → остальные модули (платформенный администратор не участвует в этом процессе)
- Приём приглашения и установка пароля клиентом → `.docs/modules/auth.md` (этот модуль только создаёт приглашение, принимает его другая сторона в другом модуле)
- Биллинг — не существует ни в каком виде

---

## Архитектурные решения

### 1. `PlatformAdmin` — не `User`, отдельная сессия

См. подробное обоснование в `.docs/database.md` → «Платформенный уровень». Здесь — практическое следствие: NextAuth v5 настроен с двумя credentials-провайдерами (или одним с дискриминатором), но в любом случае сессия несёт `kind: "platform"` либо `kind: "company"`, и эти два типа никогда не смешиваются ни в одном route handler.

```typescript
// types/next-auth.d.ts — концепт
type Session =
  | { kind: "company"; user: { id: string; companyId: string; role: UserRole; impersonatedByPlatformAdminId?: string } }
  | { kind: "platform"; admin: { id: string; email: string } };
```

### 2. Платформенный администратор не имеет «суперроли» внутри компаний — он либо вне них, либо временно «является» одним из их пользователей (impersonation)

Нет отдельного «бэкдор»-API для редактирования чужих лидов напрямую с платформенного уровня. Любое изменение данных компании происходит через обычный прикладной код, под обычной (impersonation-) сессией пользователя этой компании — см. раздел 7.

---

## Bootstrap первого платформенного администратора

### Поведение (PLAT-01)

Одноразовый скрипт, не публичная регистрация:

```bash
pnpm bootstrap:platform-admin
```

```typescript
// scripts/bootstrapPlatformAdmin.ts — концепт
async function main() {
  const existing = await prisma.platformAdmin.count();
  if (existing > 0) {
    console.log("Платформенный администратор уже существует, bootstrap не требуется.");
    return;
  }
  await prisma.platformAdmin.create({
    data: {
      email: process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL!,
      passwordHash: await hashPassword(process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD!),
      name: "Платформенный администратор",
    },
  });
}
```

Запускается один раз при первом деплое. После этого `PLATFORM_ADMIN_BOOTSTRAP_*` можно убрать из `.env` — скрипт сам себя не выполнит повторно, если запись уже есть.

---

## Вход платформенного администратора — отдельная сессия

### Поведение

`/platform/login` — отдельная форма, отдельный API-роут, ищет в `PlatformAdmin`, не в `User`. Успешный вход выставляет сессию с `kind: "platform"`.

```
POST /api/platform/login { email, password }
  → найти PlatformAdmin по email
  → bcrypt.compare(password, passwordHash)
  → сессия { kind: "platform", admin: { id, email } }
  → редирект на /platform/companies
```

Без MFA в этой версии — платформенных администраторов мало и они доверенные сотрудники, не публичная аудитория; если понадобится — добавляется поверх без структурных изменений.

---

## Создание компании и приглашение

### Поведение (INIT-01…05)

```
POST /api/platform/companies { name, adminEmail }
  → транзакция (полный код — .docs/database.md):
     - Company { isBlocked: false, settings: дефолты }
     - 5 дефолтных этапов воронки
     - дефолтный набор причин отказа
     - CompanyInvite { email: adminEmail, tokenHash, expiresAt: +7 дней }
     - событие COMPANY_CREATED
  → возвращает companyId + ссылку /accept-invite?token=...
```

Ссылка передаётся клиенту вручную платформенным администратором (скопировать и отправить) — автоматическая отправка письма может быть добавлена позже без структурных изменений (просто вызов `sendEmail()` в том же месте).

### Список компаний

`GET /api/platform/companies` — таблица: название, дата создания, статус (активна/заблокирована), число пользователей, дата последнего входа кого-либо из компании (агрегат по `User.lastLoginAt`).

---

## Блокировка и разблокировка компании

### Поведение (BLOCK-01…04)

```
PATCH /api/platform/companies/:id { isBlocked: true }
  → Company.isBlocked = true
  → событие COMPANY_BLOCKED { byPlatformAdminId }
  → с следующего входа: authorize() для пользователей этой компании возвращает null/ошибку
  → приём лидов по вебхукам НЕ затронут — продолжает работать как обычно
```

Разблокировка — симметрично, событие `COMPANY_UNBLOCKED`. Никаких данных не удаляется и не архивируется в обоих направлениях.

---

## Вход от имени компании (impersonation)

### Поведение (IMP-01…05, PLAT-07, PLAT-08)

```
1. Платформенный администратор открывает компанию → видит список её пользователей
2. Выбирает, от чьего имени войти (обычно — первый ADMIN, но можно любого, например, для воспроизведения бага конкретного менеджера)
3. POST /api/platform/companies/:companyId/impersonate/:userId
   → создаётся сессия { kind: "company", user: { id: userId, companyId, role }, impersonatedByPlatformAdminId: platformAdmin.id }
   → событие PLATFORM_IMPERSONATION_STARTED { companyId, userId, platformAdminId }
   → редирект на /today (обычный интерфейс компании)
4. Постоянный баннер сверху: "Вы вошли как поддержка LeadFlow — {компания}" + кнопка "Выйти из режима поддержки"
5. Любое действие внутри компании пишет обычное событие с userId = выбранный пользователь,
   ДОПОЛНИТЕЛЬНО помеченное impersonatedByPlatformAdminId
6. POST /api/platform/impersonate/end → завершение, событие PLATFORM_IMPERSONATION_ENDED, редирект на /platform/companies
```

**Пароль клиента не используется и не раскрывается на всех этапах.** Это и есть весь смысл механизма — см. обоснование в `.docs/database.md` → «Вход от имени компании».

### Видимость для самого клиента

Клиент может видеть в истории своих лидов отметку «изменено поддержкой LeadFlow» там, где `impersonatedByPlatformAdminId` заполнен — прозрачность работает в обе стороны, не только для аудита платформы.

---

## Активность компаний

### Поведение (PLAT-05)

`GET /api/platform/activity` — без новых таблиц, агрегаты по существующим данным:

```
По каждой компании:
  - последний вход (MAX(User.lastLoginAt))
  - число лидов за выбранный период (COUNT(Lead) WHERE createdAt BETWEEN ...)
  - число активных пользователей (COUNT(User) WHERE isBlocked = false)
  - дата создания компании
```

**Это не отчёт о лидах** (платформенный администратор не видит конверсию, причины отказа, скорость ответа конкретной компании на этом экране — это её внутреннее дело) — только сигналы «компания живая и работает» или «давно никто не заходил, возможно, стоит написать».

---

## Управление платформенными администраторами

### Поведение (PLAT-02)

```
GET/POST /api/platform/admins
  → список существующих, создание нового { email, name, password }
```

Без удаления в этой версии (если сотрудник перестал быть платформенным админом — это редкая ручная операция, можно сделать прямым обращением к БД; отдельный UI для удаления не оправдан этим объёмом использования). Без внутренней иерархии — см. `.docs/database.md`.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth |
| --- | --- | --- | --- |
| POST | `/api/platform/login` | Вход | Public |
| GET/POST | `/api/platform/companies` | Список / создание | `kind: "platform"` |
| PATCH | `/api/platform/companies/:id` | Блокировка/разблокировка | `kind: "platform"` |
| POST | `/api/platform/companies/:id/impersonate/:userId` | Вход от имени компании | `kind: "platform"` |
| POST | `/api/platform/impersonate/end` | Завершение impersonation | `kind: "company"` + `impersonatedByPlatformAdminId` заполнен |
| GET/POST | `/api/platform/admins` | Управление платформенными администраторами | `kind: "platform"` |
| GET | `/api/platform/activity` | Активность компаний | `kind: "platform"` |

### `POST /api/platform/companies`

**Request:** `{ "name": "ООО Ромашка", "adminEmail": "ivan@romashka.ru" }`
**Response 200:** `{ "companyId": "clxxx", "inviteUrl": "https://app.../accept-invite?token=..." }`

---

## Файлы, которые создаются

```
app/
├── (public)/platform/login/page.tsx
├── (platform)/platform/
│   ├── companies/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx          # детали компании, пользователи, impersonate-кнопки
│   ├── admins/page.tsx
│   └── activity/page.tsx
└── api/
    └── platform/
        ├── login/route.ts
        ├── companies/
        │   ├── route.ts                          # GET, POST
        │   └── [id]/
        │       ├── route.ts                        # PATCH (блокировка)
        │       └── impersonate/[userId]/route.ts
        ├── impersonate/end/route.ts
        ├── admins/route.ts
        └── activity/route.ts

lib/
└── platform/
    ├── auth.ts                # отдельная проверка сессии PlatformAdmin
    ├── createCompany.ts        # транзакция создания + приглашения
    ├── impersonate.ts
    └── companyActivity.ts

scripts/
└── bootstrapPlatformAdmin.ts

components/
└── platform/
    ├── CompaniesTable.tsx
    ├── CreateCompanyModal.tsx
    ├── ImpersonateButton.tsx
    ├── ImpersonationBanner.tsx     # баннер внутри компании во время impersonation
    ├── PlatformAdminsTable.tsx
    └── CompanyActivityTable.tsx
```

---

## Серверные правила безопасности

1. **`/api/platform/*` (кроме `login`) принимает только сессию `kind: "platform"`.** Сессия компании, даже с ролью ADMIN, отклоняется — это не вопрос роли, а вопрос типа аудитории.
2. **Impersonation создаёт сессию реального `User`, не виртуальный контекст** — все существующие проверки видимости/прав работают без изменений.
3. **Платформенный администратор никогда не задаёт и не видит реальный пароль пользователя компании.** Сброс пароля клиента (если нужен) — через обычный `forgot-password`, не через платформенный уровень.
4. **Начало и конец impersonation — обязательные события**, не опциональное логирование.
5. **Любое прикладное действие во время impersonation помечается `impersonatedByPlatformAdminId`** — это поле выставляется на уровне `lib/events.ts`, не требует ручного указания в каждом месте, где пишется событие (берётся из сессии автоматически).
6. **Блокировка компании не имеет отдельного guard на каждый мутирующий эндпоинт** — проверяется один раз, в `authorize()`, при входе.
7. **`CompanyInvite.tokenHash` — одноразовый и с TTL**, как и токен восстановления пароля.

---

## Связи с другими модулями

- **`.docs/modules/auth.md`** — принимает приглашение, создаёт первого `User` компании с ролью `ADMIN`; общий механизм входа (`authorize()`) проверяет и `User.isBlocked`, и `Company.isBlocked`.
- **`.docs/database.md`** — модели `PlatformAdmin`, `CompanyInvite`, поле `Event.impersonatedByPlatformAdminId`, транзакции создания компании и блокировки.
- **`CLAUDE.md`** — `proxy.ts` различает три типа путей (публичные, компания, платформа) по `session.kind`.
- Все остальные модули — потенциальный получатель impersonation-сессии: для них она ничем не отличается от обычной сессии пользователя компании.
