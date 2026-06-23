# Development Log

Журнал сессий разработки. Записывай сюда что сделано после каждой сессии.

---

## 2026-06-23 — Phase 2, Дополнение: удаление платформенного администратора + восстановление пароля платформы

**Статус:** ✅ Завершён

**Что было реализовано:**

- Soft delete платформенных администраторов: деактивация вместо физического удаления (`isActive`, `deletedAt`), запрет удаления самого себя и последнего активного администратора
- Повторное создание администратора с ранее удалённым email: восстановление (reactivate) существующей записи вместо ошибки уникальности
- Отдельный flow восстановления пароля платформенного администратора:
  - страница запроса ссылки `/platform/forgot-password`
  - страница установки нового пароля `/platform/reset-password`
  - API `/api/platform/auth/forgot-password` и `/api/platform/auth/reset-password`
- Одноразовые reset-токены с TTL 1 час для платформенных администраторов (хранение хэша токена, инвалидирование после использования)
- Публичный доступ в `proxy.ts` для `/platform/forgot-password` и `/platform/reset-password`
- Ссылка «Забыли пароль?» на форме входа платформенного администратора
- Email-отправка reset-ссылки через SMTP-конфиг (`SMTP_*`) с graceful fallback, если SMTP не настроен

---

## 2026-06-23 — Phase 2, TASK: Управление платформенными администраторами + активность компаний

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/platform/companyActivity.ts` — `getCompanyActivity(periodStart)`: агрегат по всем компаниям (`lastLoginAt` через `groupBy` Users, `leadCount` за период, `activeUsers` без блокировки, `createdAt`)
- `lib/validations/platform.ts` — `createPlatformAdminSchema`, `activityPeriodSchema` (7/30/90), тип `CreatePlatformAdminInput`
- `types/platform.ts` — типы `PlatformAdminListItem` и `CompanyActivityItem`
- `app/api/platform/admins/route.ts` — `GET` список без `passwordHash`; `POST` с Zod + `hashPassword`, создание `PlatformAdmin`, обработка дубликата email (`P2002` → 400)
- `app/api/platform/activity/route.ts` — `GET ?period=7|30|90` (дефолт 30), `requirePlatformSession()`, вызов `getCompanyActivity(periodStart)`
- `app/(platform)/platform/admins/page.tsx` — Server Component: fetch `GET /api/platform/admins` с cookie, передача в таблицу
- `app/(platform)/platform/activity/page.tsx` — Server Component: fetch `GET /api/platform/activity?period=30`, передача начальных данных
- `components/platform/PlatformAdminsTable.tsx` — таблица администраторов, модалка создания (Zod на клиенте), `POST` → строка добавляется без перезагрузки
- `components/platform/CompanyActivityTable.tsx` — переключатель 7/30/90 (перезапрос API), client-side поиск и сортировка, жёлтая подсветка `#F59E0B` для `lastLoginAt = null` или > 30 дней

**Что было реализовано сверх плана `TASK.md`:**

- нет

---

## 2026-06-23 — Phase 2, TASK: Impersonation — токены + provider + баннер + события

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/platform/impersonate.ts` — in-memory `Map` одноразовых токенов impersonation с TTL 60 сек, `createImpersonationToken()` и `consumeImpersonationToken()`
- `lib/auth.ts` — добавлен credentials provider `impersonation`; `authorize()` потребляет токен, проверяет пользователя по `userId + companyId`, создаёт company-сессию с `impersonatedByPlatformAdminId`
- `app/api/platform/companies/[id]/impersonate/[userId]/route.ts` — `POST` с `requirePlatformSession()`, проверкой принадлежности `userId` компании, выдачей `{ token }`, записью `PLATFORM_IMPERSONATION_STARTED`
- `app/api/platform/impersonate/end/route.ts` — `POST` только для `kind: "company"` с `impersonatedByPlatformAdminId`, запись `PLATFORM_IMPERSONATION_ENDED`, очистка сессии/cookies, `401` для нецелевых сессий
- `app/(platform)/platform/companies/[id]/page.tsx` — Server Component страницы компании: загрузка компании, пользователей и агрегатов
- `components/platform/ImpersonateButton.tsx` — кнопка impersonation (`POST` token endpoint -> `signIn('impersonation', { token, redirectTo: '/today' })`) с loading-состоянием
- `components/platform/ImpersonationBanner.tsx` — фиксированный баннер режима поддержки, выход через `POST /api/platform/impersonate/end` с переходом на `/platform/login`
- `app/(app)/layout.tsx` — условный рендер `ImpersonationBanner` для company-сессии с `impersonatedByPlatformAdminId`
- `lib/validations/platform.ts` + оба impersonation endpoint — добавлена Zod-валидация для новых API handler (`impersonateUserParamsSchema`, `endImpersonationBodySchema`) по требованиям DoD Global

**Что было реализовано сверх плана `TASK.md`:**

- `app/(public)/accept-invite/page.tsx`
- `app/api/auth/accept-invite/route.ts`
- `components/auth/AcceptInviteForm.tsx`
- `lib/auth/acceptInvite.ts`
- `lib/validations/auth.ts`
- `components/platform/CompanyDetailPageClient.tsx`
- `types/platform.ts`

---

## 2026-06-23 — Phase 2, Таск 3: Список компаний + блокировка/разблокировка (API + UI)

**Статус:** ✅ Завершён

**Что было сделано:**

- `app/api/platform/companies/route.ts` — добавлен `GET`: `requirePlatformSession()`, список компаний с `_count.users` и `MAX(User.lastLoginAt)` через `groupBy`; ответ `{ id, name, isBlocked, createdAt, userCount, lastLoginAt }`
- `app/api/platform/companies/[id]/route.ts` — `PATCH { isBlocked }`: Zod `blockCompanySchema`, `prisma.company.update()`, события `COMPANY_BLOCKED` / `COMPANY_UNBLOCKED` с `payload.byPlatformAdminId`
- `lib/validations/platform.ts` — добавлены `blockCompanySchema` и тип `BlockCompanyInput`
- `types/platform.ts` — тип `PlatformCompanyListItem` для списка компаний
- `app/(platform)/layout.tsx` — платформенный layout: сайдбар `#1A1F2E` 220px + `flex-1 overflow-auto`
- `components/platform/PlatformSidebar.tsx` — навигация (Компании / Администраторы / Активность), Tabler Icons 16px, active link `text-[#10B981]` + `bg-white/5`
- `components/platform/PlatformSignOutButton.tsx` — `signOut({ redirectTo: '/platform/login' })`
- `app/(platform)/platform/companies/page.tsx` — Server Component: `requirePlatformSession()`, fetch `GET /api/platform/companies` с cookie из `headers()`
- `components/platform/CompaniesPageClient.tsx` — шапка «Компании» + кнопка «+ Создать компанию», связка таблицы и модалки
- `components/platform/CompaniesTable.tsx` — таблица с бейджами статуса, оптимистичная блокировка/разблокировка, клик по строке → `/platform/companies/[id]`, пустое состояние
- `components/platform/CreateCompanyModal.tsx` — двухшаговая модалка: форма создания → `inviteUrl` с копированием; «Готово» → `router.refresh()`

**Definition of Done:** ✅ Все пункты TASK.md выполнены (`npm run type-check` — без ошибок)

---

## 2026-06-23 — Phase 2, Таск 2: Создание компании — транзакция + lib

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/tokens.ts` — `generateToken()` (32 байта → 64 hex) и `hashToken()` (SHA-256) для invite-токенов
- `constants/defaultCompanyData.ts` — `DEFAULT_COMPANY_SETTINGS`, `DEFAULT_STAGES(companyId)`, `DEFAULT_LOSS_REASONS(companyId)` по `.docs/database.md`
- `lib/platform/createCompany.ts` — `createCompany()`: одна Prisma-транзакция (Company + 5 этапов + 9 причин отказа + CompanyInvite TTL 7 дней + Event `COMPANY_CREATED`); возвращает plain `inviteToken`
- `lib/validations/platform.ts` — добавлен `createCompanySchema` (`name`, `adminEmail`)
- `app/api/platform/companies/route.ts` — `POST`: `requirePlatformSession()` → Zod → `createCompany()` → `{ companyId, inviteUrl }`; 401 без platform-сессии, 400 при невалидном email

**Definition of Done:** ✅ Все пункты TASK.md выполнены (`npm run type-check`, `npm run build` — без ошибок)

---

## 2026-06-23 — Phase 2, Таск 1: lib-фундамент + bootstrap + вход платформенного администратора

**Статус:** ✅ Завершён

**Что было сделано:**

- `lib/password.ts` — `hashPassword()` и `comparePassword()` через bcrypt (12 rounds)
- `lib/events.ts` — `writeEvent()`: запись `Event` в БД; `impersonatedByPlatformAdminId` берётся из company-сессии через `auth()`, иначе `null`
- `lib/platform/auth.ts` — `requirePlatformSession()`: проверка `kind === "platform"`, иначе Response 401
- `lib/validations/platform.ts` — `loginSchema` (email + password)
- `lib/auth.ts` — реализован `authorize()` в провайдере `platform-credentials`: поиск `PlatformAdmin` по email, `comparePassword()`, сессия `{ kind: "platform", id, email }`
- `scripts/bootstrapPlatformAdmin.ts` — идемпотентный bootstrap первого `PlatformAdmin` из `PLATFORM_ADMIN_BOOTSTRAP_*` в `.env`
- `package.json` — `tsx` в devDependencies, скрипт `bootstrap:platform-admin`
- `app/(public)/platform/login/page.tsx` — страница входа с `<PlatformLoginForm>`, layout без сайдбара
- `components/platform/PlatformLoginForm.tsx` — форма email + password, `signIn('platform-credentials')`, общее сообщение об ошибке без раскрытия email; кнопка показа/скрытия пароля

**Definition of Done:** ✅ Все пункты TASK.md выполнены

---

## 2026-06-22 — Phase 0, Таск 3: Realign `app/` под v4.0-группы + чистка + layout-заглушка

**Статус:** ✅ Завершён

**Что было сделано:**

- Перенесены существующие страницы (без дублирования):
  - `(auth)/login` → `(public)/login`
  - `(app)/dashboard` → `(app)/today`
  - `(admin)/admin/pipeline` → `(admin)/admin/pipeline-settings`
- Созданы stub-страницы: `(public)/accept-invite`, `forgot-password`, `reset-password`, `platform/login`; `(management)/control`, `reports`; `(platform)/platform/companies`, `admins`, `activity`
- Созданы layout-заглушки: `(management)/layout.tsx`, `(platform)/layout.tsx` — `return children`
- Удалены устаревшие маршруты и артефакты: `(auth)/`, `(shell)/`, `(app)/tasks`, `(admin)/admin/profile`, `lib/license.ts`
- `app/page.tsx` — ссылка `/dashboard` → `/today`
- `constants/navItems.ts` — «Сегодня» `/today`, убран пункт `/tasks`
- `app/(app)/pipeline/page.tsx` — путь настроек `/admin/pipeline-settings`
- `components/layout/ShellGate.tsx` — публичные и платформенные маршруты без сайдбара компании
- `components/layout/Sidebar.tsx` — убрана ссылка на удалённый `/admin/profile`
- Документация: `pnpm` → `npm` в `CLAUDE.md`, `README.md`, `platform-admin.md`, `.clinerules/project-context.md`
- `.docs/phases/_status.md` и `.docs/phases/phase-0.md` — Task 3 ✅, Phase 0 ✅
- Проверено: `npm run type-check` и `npm run build` — без ошибок; `rg "pnpm"` — только `.pnpm-debug.log*` в `.gitignore`

**Definition of Done:** ✅ Все пункты выполнены

---

## 2026-06-22 — Phase 0, Таск 2: Roles + NextAuth-скелет + proxy.ts + health-check

**Статус:** ✅ Завершён

**Что было сделано:**

- `constants/roles.ts` — `ROLE_RANK` + `hasMinRole()` для иерархии ролей
- `lib/auth.ts` — NextAuth v5 скелет: два credentials-провайдера-заглушки, JWT/session callbacks с `kind: "company" | "platform"`
- `types/next-auth.d.ts` — module augmentation для `Session`, `User`, `JWT` (`@auth/core/jwt` + `next-auth/jwt`)
- `proxy.ts` — защита роутов по `session.kind` и `hasMinRole()`; matcher v4.0-зон
- `app/api/health/route.ts` — пинг БД через `prisma.$queryRaw`
- `app/api/auth/[...nextauth]/route.ts` — экспорт `handlers` из `lib/auth.ts`
- `tsconfig.json` — добавлен `types/**/*.d.ts` в include для подхвата augmentation
- Проверено: `GET /api/health` → 200, `/leads` → redirect `/login`, `/platform/*` → redirect `/platform/login`, `/dashboard` без сессии доступен
- `npm run type-check` и `npm run build` — без ошибок

**Definition of Done:** ✅ Все пункты выполнены

---

## 2026-06-22 — Phase 0, Таск 1: Dependencies + Prisma Schema + Init Migration

**Статус:** ✅ Завершён

**Что было сделано:**

- `package.json` — добавлены зависимости: `prisma`, `@prisma/client`, `next-auth@5`, `zod`, `zustand`, `bcrypt` (+ `@types/bcrypt` в devDeps)
- Добавлены npm scripts: `type-check`, `db:migrate`, `db:generate`
- `prisma/schema.prisma` — реализована полная схема из `.docs/database.md`:
  - 9 enum'ов (UserRole, AssignMode, LeadVisibility, CloseType, EventType с компании и платформенных событиями, ReminderStatus, TaskStatus, DuplicateMatchType, ImportStatus)
  - 16 моделей (Company, User, PlatformAdmin, Lead, PipelineStage, Comment, DuplicateFlag, LossReason, Event, ApiKey, IntegrationSource, AssignmentRule, Reminder, Task, ImportBatch, CompanyInvite)
  - Все индексы и constraints, включая composite unique на `IntegrationSource([companyId, type, label])`
  - Event.userId и Event.impersonatedByPlatformAdminId — скаляры без FK (событие переживает удаление пользователя)
- `lib/prisma.ts` — синглтон PrismaClient с dev-global guard (в dev не плодит лишние коннекты)
- `.env.example` — выровнен по CLAUDE.md (DATABASE*URL, AUTH_SECRET, AUTH_URL, APP_URL, TELEGRAM_BOT_TOKEN, SMTP*_, PLATFORM*ADMIN_BOOTSTRAP*_, без платёжных переменных)
- `npm install` — все зависимости установлены
- `prisma migrate dev --name init` — миграция применена, все таблицы и enum'ы созданы в БД
- `npm run type-check` — ошибок нет

**Definition of Done:** ✅ Все пункты выполнены

---
