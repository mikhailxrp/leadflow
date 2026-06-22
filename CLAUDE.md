# CLAUDE.md — Project Rules

Этот файл читается при каждой сессии.
Следуй этим правилам при любой задаче.
Правила оформления кода и работы с проектом смотри тут .docs/rules/\*.mdc

> **v4.0**

---

## О проекте

**LeadFlow** — мультитенантная CRM для обработки лидов малого бизнеса. Принимает лиды из рекламных каналов (Tilda, WordPress, Яндекс Директ, любые формы через webhook/API, ручной ввод, импорт CSV/Excel), ведёт по настраиваемой Kanban-воронке, распределяет между менеджерами, контролирует первый ответ трёхступенчатой эскалацией, не даёт лиду остаться без следующего шага.

**Главный принцип, который не нарушает ни одна фича:** лид нельзя потерять — ни по структуре данных формы, ни по блокировке компании.

**Модель продукта:** Управляемая многотенантная платформа. Компании **не регистрируются сами** — их создаёт платформенный администратор (один и более — это growing-таблица, не единственный хардкоженный аккаунт) и приглашает первого администратора компании по ссылке. Никакого биллинга внутри продукта нет — коммерческие договорённости с клиентом находятся вне системы.

**Четыре уровня доступа:**

```
Платформенный администратор   — вне любой компании, создаёт/блокирует компании, входит в них через
                                 impersonation для поддержки. Не работает с лидами.
Администратор (компании)       — настройки, пользователи, поля, этапы, источники, нормативы, права
Руководитель                   — + все лиды, все сотрудники, контроль, отчёты, распределение нагрузки
Менеджер                        — свои лиды, свои задачи, свои просрочки, доступная история
```

Роли внутри компании — иерархия (`ADMIN` ⊇ `HEAD` ⊇ `MANAGER`), не три изолированных набора прав: у администратора есть всё, что есть у руководителя, у руководителя — всё, что есть у менеджера. Платформенный администратор — отдельная сущность, не верхушка этой иерархии (он не часть ни одной компании, см. `database.md`).

**Деплой:** собственная инфраструктура поставщика (VPS), dev/prod окружения на одном сервере, GitHub Actions с self-hosted runner. PostgreSQL на том же сервере (две базы — dev/prod).

---

## Документация

| Тема                                           | Файл                              |
| ---------------------------------------------- | --------------------------------- |
| Обзор продукта + фичи + роадмап                | `.docs/prd.md`                    |
| Схема БД (Prisma)                              | `.docs/database.md`               |
| Детальная спецификация модуля                  | `.docs/modules/<module-name>.md`  |
| Платформенный администратор, создание компаний | `.docs/modules/platform-admin.md` |
| Экран «Сегодня»                                | `.docs/modules/today.md`          |
| Индикатор риска (сквозная логика)              | `.docs/modules/risk.md`           |
| Импорт CSV/Excel                               | `.docs/modules/import.md`         |
| Отчёты                                         | `.docs/modules/reports.md`        |
| Текущая фаза                                   | `.docs/phases/phase-N.md`         |
| Текущий таск                                   | `TASK.md`                         |
| Definition of Done                             | `.docs/dod-global.md`             |
| Журнал сессий                                  | `.docs/dev-log.md`                |
| Дизайн-система                                 | `.docs/design-system.md`          |

---

## Tech Stack

**Используем:**

| Слой           | Технология                               | Почему                                                                                                                                                                                                            |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | Next.js `^16.2.6` (App Router)           | Файловая маршрутизация совпадает со структурой ролей/зон доступа                                                                                                                                                  |
| React          | React 19.x                               | —                                                                                                                                                                                                                 |
| Language       | TypeScript 5+ (strict)                   | —                                                                                                                                                                                                                 |
| Database       | PostgreSQL + Prisma                      | —                                                                                                                                                                                                                 |
| Auth           | NextAuth.js v5 (credentials, JWT-сессии) | Две независимые аудитории сессий: пользователи компаний (`companyId` + `role`) и платформенные администраторы (без `companyId`) — общий движок, разные провайдеры и разная форма сессии (`session.kind: "company" |
| Realtime       | SSE                                      | —                                                                                                                                                                                                                 |
| Telegram       | Telegram Bot API                         | Уведомления менеджерам/руководителям; не канал приёма лидов                                                                                                                                                       |
| Импорт файлов  | `xlsx` (SheetJS) + `papaparse`           | Разбор Excel/CSV при импорте лидов, без файлового хранилища — обработка транзитом                                                                                                                                 |
| Styling        | Tailwind CSS                             | —                                                                                                                                                                                                                 |
| Validation     | Zod                                      | —                                                                                                                                                                                                                 |
| State (client) | Zustand                                  | —                                                                                                                                                                                                                 |
| Drag-and-drop  | `@dnd-kit/core`                          | —                                                                                                                                                                                                                 |
| Password       | bcrypt                                   | —                                                                                                                                                                                                                 |

**Не используем:**

- Server Actions для бизнес-логики, shadcn/ui, class components, CSS-in-JS, Redux, moment.js, OAuth-провайдеры (кроме Яндекс Директа — интеграционный кейс, не auth).
- **Тарифы, биллинг, ЮKassa/Robokassa** — продукт не продаёт себя через себя; коммерция — вне системы.
- **WhatsApp Business API/агрегаторы** — было решено отказаться полностью, не только отложить.
- **Самостоятельная регистрация компаний** — компании создаёт только платформенный администратор.
- **Хранение или передача реальных паролей клиентов кем-либо, включая платформенного администратора** — для доступа внутрь компании есть impersonation, не общий пароль.

---

## Архитектура

### Зоны приложения (App Router)

Структура папок прямо отражает минимальную требуемую роль — это не только удобство, это и есть механизм защиты на уровне `proxy.ts` (см. ниже): один путь = один порог доступа.

```
/
├── app/
│   ├── (public)/                  # Без сессии
│   │   ├── login/page.tsx          # Вход пользователя компании
│   │   ├── accept-invite/page.tsx  # Приём приглашения — заменяет /register
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── platform/
│   │       └── login/page.tsx      # Вход платформенного администратора — отдельная форма
│   │
│   ├── (app)/                     # Любой авторизованный пользователь компании
│   │   ├── today/
│   │   ├── leads/
│   │   └── pipeline/
│   │
│   ├── (management)/              # HEAD и выше (Руководитель, Администратор)
│   │   ├── control/                # Счётчик активности менеджеров — НОВОЕ местоположение
│   │   └── reports/
│   │
│   ├── (admin)/admin/             # Только ADMIN
│   │   ├── users/
│   │   ├── integrations/
│   │   ├── pipeline-settings/
│   │   ├── settings/               # + причины отказа, нормативы эскалации, рабочее время, правила назначения
│   │   └── import/
│   │
│   ├── (platform)/platform/       # Только PlatformAdmin — отдельная сессия
│   │   ├── companies/              # Список, создание, блокировка/разблокировка, impersonation
│   │   ├── admins/                 # Управление платформенными администраторами
│   │   └── activity/               # Отчёты об активности компаний (не о лидах)
│   │
│   └── api/
│       ├── auth/
│       ├── platform/                # Отдельный namespace, своя проверка сессии
│       │   ├── login/
│       │   ├── companies/
│       │   ├── admins/
│       │   ├── activity/
│       │   └── impersonate/
│       ├── webhooks/
│       │   ├── tilda/[companyId]/
│       │   ├── wordpress/[companyId]/
│       │   └── leads/
│       ├── leads/
│       ├── stages/
│       ├── users/
│       ├── settings/
│       ├── assignment-rules/
│       ├── loss-reasons/
│       ├── api-keys/
│       ├── reminders/
│       ├── tasks/
│       ├── import/
│       ├── reports/
│       └── stream/
│
├── components/
│   ├── ui/
│   ├── auth/
│   ├── platform/                  # НОВОЕ
│   ├── today/
│   ├── risk/
│   ├── import/
│   ├── reports/
│   ├── leads/
│   ├── pipeline/
│   ├── notifications/
│   ├── reminders/
│   ├── tasks/
│   └── admin/
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── password.ts
│   ├── telegram.ts
│   ├── events.ts
│   ├── sse.ts
│   ├── assignLead.ts             # AssignmentRule → assignMode
│   ├── roundRobin.ts
│   ├── platform/                  # НОВОЕ
│   │   ├── auth.ts                 # отдельная проверка сессии PlatformAdmin
│   │   ├── createCompany.ts
│   │   ├── impersonate.ts
│   │   └── companyActivity.ts      # отчёты об активности компаний
│   ├── risk/
│   │   └── computeRisk.ts
│   ├── import/
│   │   ├── parseFile.ts
│   │   └── runImport.ts
│   ├── intake/
│   ├── reminders/
│   │   ├── scheduler.ts
│   │   └── channels/
│   ├── control/
│   │   ├── checkReactionTime.ts
│   │   ├── checkStuckLeads.ts
│   │   └── checkSourceHealth.ts
│   └── validations/
│
├── constants/                     # roles.ts (ROLE_RANK/hasMinRole), eventTypes, leadSources, defaultStages, defaultLossReasons
├── store/
├── types/
├── prisma/                         # schema.prisma + migrations
├── public/
└── proxy.ts
```

`lib/billing/`, `lib/license.ts`, `app/(public)/register/`, всё, что касалось ЮKassa/Robokassa/WhatsApp — **удалены**, не помечены deprecated.

### Принципы организации — без изменений

Разделение по фичам, зеркалирование API↔UI админки, чёткое разделение слоёв.

---

## Мультитенантность (важно)

Каждая таблица содержит `companyId`. Компании создаются непрерывно платформенным администратором — не пользователями самостоятельно.

**Жёсткое правило не изменилось:** каждый запрос к данным фильтруется по `companyId` из сессии.

**Роль — иерархия, проверяется через `hasMinRole`, не явным перечислением:**

```typescript
// constants/roles.ts
export const ROLE_RANK: Record<UserRole, number> = {
	MANAGER: 0,
	HEAD: 1,
	ADMIN: 2,
};
export function hasMinRole(role: UserRole, min: UserRole) {
	return ROLE_RANK[role] >= ROLE_RANK[min];
}
```

```typescript
// Правильно:
if (!hasMinRole(session.user.role, 'HEAD')) return forbidden();
// Неправильно — расходится при добавлении новой роли в будущем:
if (session.user.role !== 'ADMIN' && session.user.role !== 'HEAD')
	return forbidden();
```

**Блокировка компании (`Company.isBlocked`) проверяется при входе**, не на каждый запрос — см. `database.md` → «Блокировка компании». Приём лидов по вебхукам не зависит от этого флага вообще.

**Лимита пользователей нет** — тарифов больше не существует.

---

## Правила по слоям

### Server Components, Client Components, API Routes, Database, TypeScript, Styling — без изменений

Server Component по умолчанию, явные REST API Routes, Zod-валидация, `where: { companyId }` всегда, индексы, JSONB для гибких полей.

### Security — дополнено

- Все входы валидируются через Zod.
- Защита роутов через `proxy.ts` + проверка роли и `companyId`.
- **Платформенная сессия и сессия пользователя компании — разные `session.kind`.** Ни один эндпоинт `/api/platform/`\* не принимает сессию компании, и наоборот — это не просто проверка роли, это проверка типа сессии целиком.
- **Impersonation-сессия логируется на старте и на конце** (`PLATFORM_IMPERSONATION_STARTED`/`ENDED`), каждое действие внутри неё аннотируется `impersonatedByPlatformAdminId` в `events`.
- API-ключи и пароли — хэшированные.

---

## Приём лидов (ключевой инвариант)

**Лид нельзя потерять.**

- Любой неизвестный набор полей формы → `customFields` (JSONB).
- Фиксированные поля — извлекаются если есть, иначе `null`.
- Каждая заявка = отдельный лид. Совпадение по телефону/email **не блокирует и не объединяет** — создаётся `DuplicateFlag`, лид всё равно сохраняется.
- **Блокировка компании не останавливает приём** — вебхуки `leads-intake` не проверяют `Company.isBlocked`. Если компания временно заблокирована, входящие лиды не теряются и будут на месте при разблокировке.
- Источник определяется по параметру `source`, привязке API-ключа или пути (`/api/webhooks/tilda/[companyId]`).

---

## Защита роутов (proxy.ts)

```typescript
// proxy.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasMinRole } from '@/constants/roles';

export const proxy = auth((req) => {
	const session = req.auth;
	const { pathname } = req.nextUrl;

	// Публичные — без проверки
	if (
		pathname.startsWith('/login') ||
		pathname.startsWith('/accept-invite') ||
		pathname.startsWith('/forgot-password') ||
		pathname.startsWith('/reset-password') ||
		pathname.startsWith('/platform/login')
	) {
		return NextResponse.next();
	}

	// Платформенная зона — отдельный тип сессии, не пересекается с компаниями
	if (pathname.startsWith('/platform')) {
		if (!session || session.kind !== 'platform') {
			return NextResponse.redirect(new URL('/platform/login', req.url));
		}
		return NextResponse.next();
	}

	// Дальше — все пути требуют обычной сессии пользователя компании
	if (!session || session.kind !== 'company') {
		return NextResponse.redirect(new URL('/login', req.url));
	}

	// HEAD и выше
	if (pathname.startsWith('/control') || pathname.startsWith('/reports')) {
		if (!hasMinRole(session.user.role, 'HEAD'))
			return NextResponse.redirect(new URL('/today', req.url));
	}

	// Только ADMIN
	if (pathname.startsWith('/admin')) {
		if (!hasMinRole(session.user.role, 'ADMIN'))
			return NextResponse.redirect(new URL('/today', req.url));
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		'/today/:path*',
		'/leads/:path*',
		'/pipeline/:path*',
		'/control/:path*',
		'/reports/:path*',
		'/admin/:path*',
		'/platform/:path*',
	],
};
```

**Почему `(management)` — отдельная группа, а не часть `(admin)`:** «контроль» и «отчёты» — возможности Руководителя, а не Администратора (см. роли выше); если бы они жили под `/admin/`\*, пришлось бы либо открывать туда доступ Руководителю целиком (включая настройки, которые ему не положены), либо разносить проверку роли по каждому файлу внутри одной папки — менее явно, чем разделение на уровне пути.

**API-проверка остаётся defense-in-depth**, не заменяется проверкой в `proxy.ts`: каждый route handler у `/control`, `/reports`, `/admin/`\* повторно проверяет `hasMinRole` сам, на случай прямого вызова API мимо страницы.

---

## Environment Variables

```bash
# .env — НЕ коммитить

# База данных
DATABASE_URL=

# NextAuth v5
AUTH_SECRET=
AUTH_URL=

# Приложение
APP_URL=

# Telegram Bot
TELEGRAM_BOT_TOKEN=

# Email (приглашения, восстановление пароля, напоминания)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Bootstrap первого платформенного администратора (используется один раз)
PLATFORM_ADMIN_BOOTSTRAP_EMAIL=
PLATFORM_ADMIN_BOOTSTRAP_PASSWORD=
```

**Убрано относительно v3.0:** `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `ROBOKASSA_MERCHANT_LOGIN`, `ROBOKASSA_PASSWORD_1/2` — вместе с биллингом.

`**PLATFORM_ADMIN_BOOTSTRAP_*`\*\* используется ровно один раз — скриптом `npm run bootstrap:platform-admin`, который создаёт первую запись `PlatformAdmin`, если таблица пуста. Дальше платформенные администраторы создаются друг другом через `/platform/admins`, эти переменные можно убрать из `.env` после первого запуска (скрипт не запускается повторно, если хоть одна запись уже есть).

---

## AI Rules (для агента)

**Перед началом задачи:** без изменений (`TASK.md`, `phase-N.md`, нужный модуль, `database.md` при вопросах по схеме).

**Во время работы:** без изменений (scope, план → список файлов → подтверждение → код).

**Технические правила:**

- Только TypeScript, Server Component по умолчанию, Zod перед записью, `where: { companyId }` всегда.
- **Проверка роли — всегда через `hasMinRole()`**, никогда явным перечислением значений enum.
- **Сессия платформенного администратора и сессия компании никогда не смешиваются** — ни в одном route handler не должно быть кода, который принимает оба типа `session.kind`.
- **Дубль — это пометка, никогда блокировка.**
- **Блокировка компании проверяется при входе, не в каждом мутирующем эндпоинте** — не добавляй повторную проверку `isBlocked` в обычные API-роуты, она уже сделана в `authorize()`.
- **Impersonation — единственный способ платформенного администратора оказаться «внутри» компании.** Никогда не реализовывай прямой доступ к паролю клиента или его сброс платформенным администратором без объяснимой причины — для этого есть `forgot-password`.
- Приём лида не должен падать из-за неизвестных полей, дубля или блокировки компании.
- Никогда не возвращать клиенту: хэши паролей, полные API-ключи, чужие (другого `companyId`) данные.

**Архитектурные принципы:**

- REST API Routes, настраиваемая воронка, Event Sourcing, `lib/assignLead.ts` (сначала `AssignmentRule`, затем `assignMode`), уведомления через два канала.
- Закрытие лида (`closeType`) — действие, не привязанное к конкретному этапу воронки.
- Платформенный уровень не вмешивается в данные компаний напрямую мимо обычного прикладного кода — даже у платформенного администратора нет отдельного «бэкдор»-API для редактирования чужих лидов, только impersonation через штатный UI.
