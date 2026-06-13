# CLAUDE.md — Project Rules

Этот файл читается при каждой сессии.
Следуй этим правилам при любой задаче.

---

## О проекте

**Мини-CRM для обработки лидов** — веб-приложение для малого бизнеса. Централизованно принимает, хранит и обрабатывает лиды из рекламных каналов (Tilda, WordPress, Яндекс Директ, любые формы через webhook/API). Лиды ведутся по настраиваемой Kanban-воронке, распределяются между менеджерами (вручную или round-robin), уведомления приходят в интерфейс (SSE) и в Telegram.

**Модель поставки:** Boxed — продукт для одного клиента, разовая поставка. Разворачивает поставщик на сервере клиента (production-build, не исходники). Архитектура мультитенантная (`companyId` во всех таблицах) — задел на будущий SaaS без переработки ядра.

**Деплой:** VPS Beget + Nginx + PM2 + GitHub Actions (CI/CD). PostgreSQL — Beget Managed Database. Файловое хранилище — Beget Cloud Storage (S3-совместимое). Секреты — в `.env` на сервере, вне репозитория.

---

## Документация

Перед началом задачи читай нужные файлы:

| Тема | Файл |
| --- | --- |
| Обзор продукта + фичи + роадмап | `.docs/prd.md` |
| Схема БД (Prisma) | `.docs/database.md` |
| Детальная спецификация модуля | `.docs/modules/<module-name>.md` |
| Текущая фаза | `.docs/phases/phase-N.md` |
| Текущий таск | `TASK.md` |
| Definition of Done | `.docs/dod-global.md` |
| Журнал сессий | `.docs/dev-log.md` |
| Дизайн-система (цвета, типографика, компоненты) | `.docs/design-system.md` |

**Принцип:** PRD — высокоуровневый обзор. Детали каждой фичи (приём лидов, воронка, карточка, распределение, уведомления, админка) — в `.docs/modules/`. При работе над таском всегда сначала открывай соответствующий модуль.

---

## Tech Stack

**Используем:**

| Слой | Технология | Почему |
| --- | --- | --- |
| Framework | Next.js `^16.2.6` (App Router) | RSC, файловый роутинг, API Routes в одном проекте. Минор `16.2` фиксируем, патчи автоматом. Ветка 15.x теряет LTS-поддержку в октябре 2026 — стартуем сразу на 16. Минимум `16.2.6` — в нём закрыты security-уязвимости майского релиза 2026 (включая обход авторизации через proxy). |
| React | React 19.x | Идёт в комплекте с Next.js 16. Server Components, новые хуки. |
| Language | TypeScript 5+ (strict) | Типы ловят ошибки до запуска. Никаких `any`. |
| Database | PostgreSQL + Prisma | Типобезопасные запросы, миграции через код. JSONB для гибких полей форм. |
| Auth | NextAuth.js v5 (credentials, JWT-сессии) | Сессии и защита роутов из коробки. Роли admin/manager в session-callback. Функция `auth()` единообразно в Server Components, API Routes и `proxy.ts`. v5 обязательна для Next.js 16 App Router. |
| Realtime | SSE (Server-Sent Events) | Уведомления о новых лидах в реальном времени. Проще WebSocket для односторонней доставки сервер→клиент. |
| Telegram | Telegram Bot API (`node-telegram-bot-api` или fetch) | Уведомления ответственному менеджеру. Токен бота — в `.env`. |
| Styling | Tailwind CSS | Утилитарный. Дизайн-токены (изумрудный акцент, тёмный сайдбар, светлая/тёмная тема) — в `tailwind.config.ts`, см. `design-system.md`. |
| Validation | Zod | Серверная валидация всех входов API. На клиенте — через `react-hook-form` + Zod. |
| State (client) | Zustand | Состояние воронки, фильтров, уведомлений. Проще Redux, без бойлерплейта. |
| Drag-and-drop | `@dnd-kit/core` | Перетаскивание карточек в Kanban и этапов в настройках воронки. |
| Password | bcrypt | Хэширование паролей. |

**Не используем:**

- Server Actions для бизнес-логики — используем явные REST API Routes (`app/api/...`). Это даёт контроль над rate limiting, единообразие защит и явные контракты. Server Actions допустимы только для простых форм без сложной валидации.
- shadcn/ui — UI-компоненты верстаются вручную на Tailwind по дизайн-системе (`components/ui/`).
- Class components, CSS-in-JS, Redux, moment.js, OAuth-провайдеры.

> **О версии Next.js:** перед `npm install` на старте проекта проверь последний патч ветки 16.2 командой `npm show next version` и зафиксируй его. Security-патчи выходят часто, конкретный номер патча меняется. Минимальная планка — `16.2.6`. Проверь также требование Next.js 16 к версии Node.js.

**Деплой:**

- Сервер клиента + Nginx как reverse proxy перед Next.js
- PM2 для процесса (автоперезапуск)
- Let's Encrypt SSL (certbot)
- Production-build, разворачивает поставщик

---

## Архитектура

### Зоны приложения (App Router)

```
/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Публичные: /login
│   ├── (app)/                # Рабочая зона: /dashboard, /leads, /pipeline — защита proxy.ts
│   ├── (admin)/              # Админская зона: /admin/* — защита proxy.ts (ADMIN only)
│   └── api/                  # REST API Routes
│       ├── auth/             # NextAuth v5 handlers
│       ├── webhooks/         # tilda, leads (универсальный), wordpress — приём лидов
│       ├── leads/            # CRUD лидов, comments, events
│       ├── stages/           # CRUD этапов воронки
│       ├── users/            # Управление менеджерами (ADMIN)
│       ├── settings/         # Настройки: режим распределения, видимость лидов
│       ├── api-keys/         # Управление API-ключами (ADMIN)
│       ├── reminders/        # CRUD напоминаний по лиду + доставка
│       ├── tasks/            # CRUD задач по лиду
│       └── stream/           # SSE-поток уведомлений
│
├── components/
│   ├── ui/                   # Базовые: Button, Input, Modal, Badge, Toast, Select
│   ├── auth/                 # Форма входа
│   ├── leads/                # Список, карточка, фильтры, поиск
│   ├── pipeline/             # Kanban-доска, карточка в колонке, drag-and-drop
│   ├── notifications/        # Toast, колокольчик, лента
│   ├── reminders/            # Блок напоминаний в карточке лида, модалка создания
│   ├── tasks/                # Блок задач в карточке лида, модалки создания/редактирования
│   └── admin/                # UI админки по фичам (users, integrations, pipeline-settings, app-settings)
│
├── lib/                      # Серверные утилиты
│   ├── prisma.ts             # Prisma client (singleton)
│   ├── auth.ts               # NextAuth v5 конфиг
│   ├── password.ts           # bcrypt + проверка
│   ├── telegram.ts           # Отправка уведомлений в Telegram
│   ├── events.ts             # writeEvent(companyId, type, payload) — запись в журнал
│   ├── sse.ts                # Менеджер SSE-подключений
│   ├── assignLead.ts         # Логика распределения (round-robin / manual)
│   ├── license.ts            # Проверка LICENSE_KEY при старте
│   ├── reminders/            # Планировщик + каналы доставки
│   │   ├── scheduler.ts      # cron-джоб: выборка pending → доставка → fired
│   │   └── channels/         # telegram.ts, email.ts (расширяемо без изменения схемы)
│   └── validations/          # Zod-схемы для всех эндпоинтов
│
├── constants/                # eventTypes, leadSources, defaultStages
├── store/                    # Zustand: pipelineStore, filterStore, notificationStore
├── types/                    # Глобальные TS-типы
├── prisma/                   # schema.prisma + migrations + seed.ts
├── public/
└── proxy.ts                  # Защита роутов (Next.js 16 — заменил middleware.ts)
```

### Принципы организации

**Разделение по фичам, не по техническому уровню.** Внутри `components/` каждая папка — отдельная фича. Всё связанное с одной фичей лежит вместе.

**Зеркалирование между API и UI админки.** Каждой странице `app/(admin)/admin/<фича>/` соответствует свой набор `app/api/<фича>/` и компонентов `components/admin/<фича>/`.

**Чёткое разделение слоёв:** на сервере нет прямых импортов из `store/`, на клиенте нет прямых импортов из `lib/prisma.ts`.

**Источник правды:** для деталей API — `.docs/modules/<feature>.md`, для схемы БД — `.docs/database.md`, для роадмапа — `.docs/prd.md`. Этот файл (`CLAUDE.md`) — высокоуровневый контракт.

---

## Мультитенантность (важно)

Каждая таблица содержит `companyId`. Это закладка на будущий SaaS, действующая с первого дня.

**Жёсткое правило:** каждый запрос к данным фильтруется по `companyId` из сессии. Никогда не запрашивай лиды/пользователей/этапы без условия `where: { companyId }`. Отсутствие фильтра = утечка данных между тенантами в будущем.

Сейчас компания одна (создаётся сидером), но код пишется так, будто их много.

---

## Правила по слоям

### Server Components (по умолчанию)

- Используются по умолчанию в App Router
- Прямой доступ к БД через Prisma
- Никакого useState/useEffect
- Могут импортировать Client Components

### Client Components (`'use client'`)

- Только когда нужна интерактивность (onClick, useState, useEffect, drag-and-drop)
- Браузерные API, SSE-подписка, third-party библиотеки с hooks
- Минимизировать размер — не тянуть тяжёлые зависимости

### API Routes (`app/api/`)

- Основной способ обмена клиент↔сервер
- Каждый эндпоинт — отдельный `route.ts` с экспортом нужных HTTP-методов
- Валидация входа через Zod (схемы в `lib/validations/`)
- NextAuth v5 session — единый источник идентификации, проверка роли и `companyId`
- Rate limiting на публичных webhook-эндпоинтах
- Webhook приёма лидов аутентифицируются API-ключом, не сессией
- Запрет на запись от клиента в `events` напрямую — журнал пишет только сервер через `lib/events.ts`

### Database (Prisma)

- Все запросы через Prisma Client
- **Всегда** фильтр по `companyId`
- Транзакции для связанных операций (создание лида + событие; удаление этапа + перенос лидов)
- Индексы на `companyId`, `name`, `phone`, `email`, `stageId`
- Гибкие поля форм — в JSONB (`custom_fields`), фиксированные (имя/телефон/email) — отдельные индексируемые колонки

### TypeScript

- `strict: true` в tsconfig.json
- Никаких `any` — используй `unknown` или конкретный тип
- Zod schemas → infer типы через `z.infer<typeof schema>`

### Styling (Tailwind)

- Следуй `design-system.md`: изумрудный акцент `#10B981`, тёмный сайдбар, светлая/тёмная тема
- Никаких inline-стилей и хардкода цветов — только токены из `tailwind.config.ts`
- Адаптивность mobile-first: `sm:`, `md:`, `lg:`
- Тёмная тема через `dark:` префикс

### Security

- Все входы валидируются через Zod
- Защита роутов через `proxy.ts`, проверка роли и `companyId`
- Env variables в `.env` (в `.gitignore`)
- Пароли — bcrypt, минимум 8 символов
- API-ключи хранятся хэшированными, показываются один раз при создании
- Никогда не передавай секреты на клиент

---

## Приём лидов (ключевой инвариант)

**Лид нельзя потерять.** Приём заявки не должен падать из-за неожиданной структуры данных:

- Любой неизвестный набор полей формы → пишется в `custom_fields` (JSONB) как есть
- Фиксированные поля (имя/телефон/email) извлекаются если есть, иначе `null`
- Невалидные доп. поля не блокируют создание лида (FR-08)
- Каждая заявка = отдельный лид, дедупликация не выполняется (FR-06)
- Источник определяется по параметру `source` или привязке API-ключа

---

## Защита роутов (proxy.ts)

- Next.js 16 официально заменил `middleware.ts` на `proxy.ts`. Функция называется `proxy`. Это стандарт Next.js 16, не кастомное решение.

```typescript
// proxy.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  // Рабочая зона — авторизованные
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/leads") || pathname.startsWith("/pipeline")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
  }

  // Админская зона — только ADMIN
  if (pathname.startsWith("/admin")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (session.user.role !== "ADMIN")
      return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/leads/:path*", "/pipeline/:path*", "/admin/:path*"],
};
```

`session.user.role` ставится в callback `session()` NextAuth v5 — `'ADMIN' | 'MANAGER'`.

---

## Environment Variables

```bash
# .env — НЕ коммитить

# База данных
DATABASE_URL=

# NextAuth v5
AUTH_SECRET=
AUTH_URL=

# Telegram Bot
TELEGRAM_BOT_TOKEN=

# Лицензия (проверка при старте)
LICENSE_KEY=

# Email для напоминаний (SMTP)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Первый администратор и компания (только для seed при первом деплое)
ADMIN_INITIAL_EMAIL=
ADMIN_INITIAL_PASSWORD=
COMPANY_INITIAL_NAME=
```

**Безопасность:** `ADMIN_INITIAL_*` и `COMPANY_INITIAL_NAME` используются ТОЛЬКО сидером один раз. Дальнейшие менеджеры создаются через UI админки. `LICENSE_KEY` проверяется при старте (`lib/license.ts`) — при несовпадении приложение не стартует.

---

## AI Rules (для агента)

**Перед началом задачи:**

- Прочитай `TASK.md` и `phase-N.md`
- Прочитай соответствующий модуль из `.docs/modules/<feature>.md`
- При вопросах по БД — `.docs/database.md`

**Во время работы:**

- Работай только в scope текущего таска
- Не меняй файлы вне scope, не рефактори попутно
- Перечисли файлы которые будут изменены ДО написания кода
- Сначала: анализ → план → список файлов → подтверждение → код

**Технические правила:**

- Только TypeScript (`.ts`, `.tsx`) — никаких `.js`/`.jsx`
- Server Component по умолчанию — `'use client'` только для интерактивности
- Валидация через Zod перед любой записью в БД
- **Каждый запрос к данным — с фильтром `where: { companyId }`**
- События пишутся только через `lib/events.ts` — клиент НЕ имеет прямого API на запись
- Приём лида не должен падать из-за неизвестных полей — всё лишнее в `custom_fields`
- Никогда не возвращать клиенту: хэши паролей, полные API-ключи, чужие (другого `companyId`) данные

**Архитектурные принципы:**

- REST API Routes для бизнес-логики, не Server Actions
- Настраиваемая воронка: этапы — записи в `pipeline_stages`, не хардкод
- История лида — из таблицы `events` (Event Sourcing), не из булевых флагов
- Распределение лидов — через `lib/assignLead.ts`, режим берётся из настроек компании
- Уведомления — два канала: SSE (интерфейс) и Telegram, оба после создания лида
- Напоминания — через `lib/reminders/scheduler.ts` (cron, каждую минуту); новые каналы доставки добавляются как handler в `lib/reminders/channels/`, без изменения схемы БД; доставка параллельная (`Promise.allSettled`), сбой одного канала не отменяет другой
- Задачи — всегда привязаны к лиду (`leadId` обязателен); `TaskItem` при клике делает `router.push('/leads/' + task.leadId)`; `completedAt` выставляет только сервер при `status = DONE`; видимость задач определяется через `visibilityWhere` лида
