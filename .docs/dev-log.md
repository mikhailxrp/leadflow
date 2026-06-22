# Development Log

Журнал сессий разработки. Записывай сюда что сделано после каждой сессии.

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
- `.env.example` — выровнен по CLAUDE.md (DATABASE_URL, AUTH_SECRET, AUTH_URL, APP_URL, TELEGRAM_BOT_TOKEN, SMTP_*, PLATFORM_ADMIN_BOOTSTRAP_*, без платёжных переменных)
- `npm install` — все зависимости установлены
- `prisma migrate dev --name init` — миграция применена, все таблицы и enum'ы созданы в БД
- `npm run type-check` — ошибок нет

**Definition of Done:** ✅ Все пункты выполнены

---
