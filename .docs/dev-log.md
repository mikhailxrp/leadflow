# Development Log

Журнал сессий разработки. Записывай сюда что сделано после каждой сессии.

---

## Вспомогательные скрипты

Одноразовые/служебные скрипты для ручных операций. Запускаются локально через `tsx`, читают `.env` из корня проекта.

### `scripts/deleteCompany.ts` — удаление компании из БД

Полностью удаляет одну компанию и все её данные (лиды, события, пользователи, этапы, причины отказа, приглашения, задачи, напоминания, API-ключи и т.д.) в транзакции, в порядке зависимостей. Каждый запрос ограничен `companyId` — данные других компаний и платформенных администраторов не затрагиваются. Без аргумента или при несуществующем `id` скрипт падает, ничего не удаляя.

Запуск:

```bash
npx tsx scripts/deleteCompany.ts <companyId>
# или
npm run delete:company -- <companyId>
```

`companyId` берётся из Prisma Studio (`npx prisma studio`, таблица `Company`). Подтверждения нет — удаляется именно та компания, чей id передан.

---

## 2026-06-25 — Phase 3, Таск 4: Восстановление пароля — запрос (API + UI)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `prisma/schema.prisma` — модель `UserPasswordResetToken` (зеркало `PlatformAdminPasswordResetToken`): `id`, `userId`, `tokenHash @unique`, `expiresAt`, `usedAt?`, `createdAt`; relation на `User` с `onDelete: Cascade`; индексы по `userId` и `expiresAt`; обратная связь `passwordResetTokens` в `User`
- `prisma/migrations/20260624220335_add_user_password_reset_token` — миграция таблицы
- `.docs/database.md` — описание модели `UserPasswordResetToken` и поведения публичного эндпоинта
- `lib/auth/passwordReset.ts` — `createUserPasswordResetToken(email)`: нормализация `toLowerCase().trim()`, поиск `User` по глобально уникальному `email` без `companyId`, пропуск заблокированных (`isBlocked`); генерация токена, сохранение `hashToken(token)` с TTL 1 час; возврат `{ email, token }` или `null`
- `lib/auth/sendPasswordResetEmail.ts` — шаблон письма со ссылкой `/reset-password?token=...`; guard `isEmailConfigured()` → `console.warn` и skip без падения
- `lib/validations/auth.ts` — `forgotPasswordSchema` и `ForgotPasswordInput`
- `app/api/auth/forgot-password/route.ts` — POST, публичный; Zod-валидация; `resetUrl` из `APP_URL`; generic `{ success: true, message }` при любом исходе (нет пользователя, заблокирован, ошибка SMTP, отсутствие `APP_URL` — только `console.error`/`console.warn`); прецедент платформенного forgot-password
- `app/(public)/forgot-password/page.tsx` — заглушка «Раздел в разработке» заменена на `<ForgotPasswordForm />`
- `components/auth/ForgotPasswordForm.tsx` — Client Component: Zod-валидация email до fetch → POST `/api/auth/forgot-password` → экран успеха с generic-текстом (без редиректа и зависания) или ошибка валидации/сети

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** reset-password API и UI (`ResetPasswordForm`, `resetUserPassword`) — Таск 5; `lib/rateLimit.ts` и rate limiting — Таск 5; изменения `proxy.ts` — Таск 5

---

## 2026-06-25 — Phase 3, Таск 3: Приём приглашения — автовход

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `components/auth/AcceptInviteForm.tsx` — после успешного POST `/api/auth/accept-invite` (`200 { success: true }`) вместо безусловного редиректа на `/login?registered=1` вызывается `signIn('company-credentials', { email, password, redirect: false, redirectTo: '/today' })`: `email` — из prop invite (поле disabled/readOnly), `password` — из формы; при успехе `router.push('/today')`; при `signInResult?.error` или исключении — graceful fallback на `/login?registered=1` (аккаунт уже создан, повторный сабмит дал бы `EMAIL_EXISTS`); маппинг ошибок API до создания пользователя (`INVITE_INVALID` / `EMAIL_EXISTS` / `VALIDATION_ERROR` / `SERVER_ERROR`) сохранён

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** forgot/reset-password (Таски 4–5); rate limiting на `accept-invite` (Таск 5); изменения `lib/auth/acceptInvite.ts`, route-хендлера, миграций БД; каркас `/today` (Phase 4); клиентская Zod-предвалидация формы

---

## 2026-06-25 — Фикс: выход из режима поддержки возвращает к списку компаний

**Статус:** ✅ Завершён

**Проблема:** impersonation использует один cookie сессии NextAuth — вход «как поддержка» перезаписывал платформенную сессию компанийной. При выходе `/api/platform/impersonate/end` делал только `signOut` + чистил cookie, поэтому платформенный администратор полностью разлогинивался, а баннер уводил на `/platform/login`. Ожидалось: возврат к списку компаний платформенного администратора.

**Что было реализовано:**

- `lib/platform/impersonate.ts` — добавлено хранилище restore-токенов (TTL 60с, как у токенов impersonation): `createRestoreToken(platformAdminId)` / `consumeRestoreToken(token)`
- `lib/auth.ts` — новый провайдер `platform-restore` (credentials): потребляет restore-токен, перепроверяет `PlatformAdmin` (`isActive`, `deletedAt: null`), возвращает свежую платформенную сессию `{ kind: 'platform', id, email }`
- `app/api/platform/impersonate/end/route.ts` — вместо `signOut` + удаления cookie: валидирует impersonation-сессию, пишет `PLATFORM_IMPERSONATION_ENDED`, выдаёт restore-токен по `impersonatedByPlatformAdminId` и возвращает `{ token }` (убраны `signOut`, `cookies`, `SESSION_COOKIE_NAMES`)
- `components/platform/ImpersonationBanner.tsx` — «Выйти из режима» получает токен и вызывает `signIn('platform-restore', { token, redirectTo: '/platform/companies' })`, перезаписывая impersonation-cookie платформенной сессией и приземляясь на список компаний (вместо `window.location.href = '/platform/login'`)

**Безопасность:** restore-токен создаётся только при валидной impersonation-сессии, обращающейся к `/end`; идентификатор администратора берётся из `session.user.impersonatedByPlatformAdminId`, а не из ввода клиента.

**Известное ограничение:** restore-токены, как и impersonation-токены, хранятся в памяти процесса — не переживают рестарт и не работают между инстансами (соответствует текущей реализации impersonation, не менялось).

**Out of scope:** перенос токенов в БД/Redis; изменения обычного логаута (`LogoutButton`, `PlatformSignOutButton`); правки `proxy.ts`

---

## 2026-06-24 — Phase 3, Таск 2: Логин (UI) + логаут

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `components/auth/LoginForm.tsx` — Client Component вместо заглушки: Zod-валидация (`loginSchema`) до запроса, подсветка полей с ошибкой → `signIn('company-credentials', { email, password, redirect: false, redirectTo: '/today' })` → маппинг `result.code` (`USER_BLOCKED` / `COMPANY_BLOCKED`) в два текста блокировки, иначе generic «Неверный email или пароль» → при успехе `router.push('/today')`; ссылка «Забыли пароль?» на `/forgot-password`
- `components/layout/LogoutButton.tsx` — реализован `signOut({ redirectTo: '/login' })` вместо заглушки; кнопки выхода в `ProfileLayout` и `today/page.tsx` работают без нового файла в `components/auth/`
- `app/(public)/login/page.tsx` — Server Component: баннер «Регистрация завершена, войдите» при `searchParams.registered === '1'`

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** приём приглашения и автовход (Таск 3); forgot/reset-password (Таски 4–5); rate limiting логина (Nginx, Phase 1); каркас рабочей зоны / сайдбар (Phase 4); изменения в `authorize()` / `lib/auth.ts` / `authErrors.ts` (Таск 1)

---

## 2026-06-24 — Phase 3, Таск 1: `company-credentials` — authorize + двойная блокировка с кодами

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/auth.ts` — реализован `authorize` провайдера `company-credentials`: `loginSchema.safeParse` → `findUnique` по `email.toLowerCase().trim()` с `include: { company: true }` → `comparePassword` → `return null` при отсутствии пользователя или неверном пароле → `BlockedUserError` / `BlockedCompanyError` при блокировке → `update lastLoginAt` → `writeEvent(companyId, 'LOGIN', { userId })` → возврат `{ kind: 'company', id, companyId, role }`; провайдеры `platform-credentials` и `impersonation` не затронуты
- `lib/auth/authErrors.ts` — `BlockedUserError` и `BlockedCompanyError extends CredentialsSignin` с публичными `code = 'USER_BLOCKED' | 'COMPANY_BLOCKED'`
- `lib/validations/auth.ts` — `loginSchema` (`email`, `password`) и тип `LoginInput`
- `types/next-auth.d.ts` / `types/session.ts` — проверены, изменения не потребовались (company-форма сессии уже покрыта)

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** UI формы входа, клиентский `signIn`, маппинг `result.code` в тексты, логаут (Таск 2); автовход после приёма приглашения (Таск 3); forgot/reset password (Таски 4–5); rate limiting и правки `proxy.ts` (Таск 5)

---

## 2026-06-24 — Phase 3, Таск 0.5: Авторассылка о приближении продления (email-дайджест + cron)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `lib/platform/subscriptionReminders.ts` — `collectCompaniesNeedingRenewal()` (все компании с `nextPaymentAt`, без фильтра `isBlocked`, статус через `getSubscriptionStatus`, только `expiring | overdue`, сортировка по дате, явные типы `CompanyNeedingRenewal` / `SubscriptionDigestResult`) и канал-агностичный `sendSubscriptionDigest()` (пустой список → skip; иначе email каждому активному `PlatformAdmin`; задел под Telegram в Phase 13)
- `lib/platform/sendSubscriptionReminderEmail.ts` — шаблон дайджеста (subject + text + html: компания, дата, «осталось N дней» / «просрочено на N дней»); guard `isEmailConfigured()` с `console.warn` и skip — по образцу `sendPasswordResetEmail.ts`
- `app/api/platform/cron/subscription-reminders/route.ts` — `GET`/`POST`, защита **только** `CRON_SECRET` (Bearer / `x-cron-secret` / `?key=`), без сессии; `401` при неверном ключе; вызывает `sendSubscriptionDigest()`, ответ `{ companies, emailsSent }`; `dynamic = 'force-dynamic'`
- `.env.example` — добавлен `CRON_SECRET=`
- `.docs/dev-log.md` — эта запись + памятка про внешний crontab

**Что было реализовано сверх плана `TASK.md`:**

- `.docs/phases/_status.md` — в Phase 1 (ручная инфраструктура): пункт в «Результат», таск №5 и примечание, что crontab на VPS раз в сутки дергает эндпоинт (приложение cron само не запускает)

**Out of scope (не делалось):** Telegram-канал, настройка crontab на сервере, изменения схемы БД, дедупликация на стороне приложения, правки `proxy.ts`

**Памятка: внешний crontab на VPS (раз в сутки):**

```bash
# Пример — подставить APP_URL и CRON_SECRET из .env
0 9 * * * curl -fsS -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/platform/cron/subscription-reminders"
```

Альтернативы того же секрета: заголовок `x-cron-secret: $CRON_SECRET` или query `?key=$CRON_SECRET`. Дедупликация «не чаще раза в сутки» — на стороне планировщика, не приложения. SMTP не настроен → эндпоинт отвечает `200` с `{ companies, emailsSent: 0 }`, без падения.

---

## 2026-06-24 — Phase 3, TASK: Срок подписки компании (дата продления, управление, индикатор)

**Статус:** ✅ Завершён

**Что было реализовано в рамках `TASK.md`:**

- `prisma/schema.prisma` — поле `Company.nextPaymentAt DateTime?`, индекс `@@index([nextPaymentAt])`, enum `COMPANY_PAYMENT_UPDATED`
- `prisma/migrations/20260624185647_add_company_next_payment_at/` — миграция применена
- `.docs/database.md` — сверка: `nextPaymentAt`, индекс и `COMPANY_PAYMENT_UPDATED` уже описаны, правки не потребовались
- `lib/platform/subscription.ts` — `getSubscriptionStatus()` с порогом 14 дней (`none` / `ok` / `expiring` / `overdue`), `daysUntilDue`, `server-only`
- `lib/validations/platform.ts` — `setCompanyPaymentSchema`, `patchCompanySchema` (union: `{ isBlocked }` **или** `{ nextPaymentAt }`)
- `lib/platform/createCompany.ts` — при создании компании `nextPaymentAt = +1 год`
- `types/platform.ts` — тип `SubscriptionStatus`, поля `nextPaymentAt` и `subscriptionStatus` в `PlatformCompanyListItem` и `PlatformCompanyDetail`
- `app/api/platform/companies/route.ts` — `GET`: `nextPaymentAt` в select + вычисленный `subscriptionStatus`
- `app/api/platform/companies/[id]/route.ts` — `PATCH`: ветвление блокировка / дата продления; событие `COMPANY_PAYMENT_UPDATED { nextPaymentAt, byPlatformAdminId }`
- `app/(platform)/platform/companies/[id]/page.tsx` — загрузка `nextPaymentAt` и `subscriptionStatus` в детали компании
- `components/platform/CompaniesTable.tsx` — колонка «Следующий платёж» (дата + бейдж), красная подсветка строки при `expiring | overdue`
- `components/platform/CompaniesPageClient.tsx` — сводка-баннер «N компаний требуют продления» со ссылками
- `components/platform/CompanyDetailPageClient.tsx` — блок «Подписка»: дата, статус, `date input`, кнопка «Сбросить», оптимистичное обновление через `PATCH`

**Что было реализовано сверх плана `TASK.md`:**

- нет

**Out of scope (не делалось):** cron-дайджест email (таск 0.5), авто-блокировка по просрочке, Telegram-уведомления

---

## 2026-06-24 — Fix после DoD-check: критические замечания

**Статус:** ✅ Исправлено

**Что исправлено и почему:**

- `lib/validations/platform.ts` — `blockCompanySchema` и `setCompanyPaymentSchema` переведены в `.strict()`.
  - **Почему:** по DoD требовалось строгое XOR-поведение `PATCH` (`isBlocked` **или** `nextPaymentAt`). Без `strict` payload с двумя полями мог проходить из-за нестрогих Zod-объектов.
- Убран `setState` внутри `useEffect` в проблемных компонентах:
  - `components/dashboard/LeadsChart.tsx`
  - `components/profile/PersonalSection.tsx`
  - `components/profile/ContactsSection.tsx`
  - `components/profile/ProfileNotifications.tsx`
  - `components/profile/SecuritySection.tsx`
  - `components/tasks/TaskBlock.tsx`
  - **Почему:** линтер падал на `react-hooks/set-state-in-effect`, что блокировало критерий `npm run lint`.
- `components/profile/ProfileLayout.tsx` — для сброса форм добавлены `key` на секции профиля вместо сброса через эффекты.
  - **Почему:** это сохраняет поведение reset/save и убирает запрещённый паттерн `setState` в `useEffect`.
- Дополнительно устранены lint-предупреждения, из-за которых `eslint` завершался с ошибкой:
  - `components/pipeline/PipelineBoard.tsx` — удалён неиспользуемый импорт `PipelineCard`
  - `components/ui/Toast.tsx` — удалён неиспользуемый `ReactNode`
  - `components/ui/Avatar.tsx` — добавлен локальный `eslint-disable` для `img` (осознанное использование в этом компоненте)

**Проверка после правок:**

- `npm run type-check` ✅
- `npm run lint` ✅
- `npm run build` ✅

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
