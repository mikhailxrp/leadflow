# Модуль: Управление пользователями (admin-users)

> Спецификация управления пользователями компании. Базовая механика не изменилась; убран лимит по тарифу (тарифов не существует); добавлен выбор одной из трёх ролей при создании. Дополнено self-service профилем пользователя (`/profile`, любая роль) и read-only карточкой сотрудника для Руководителя+Администратора (`/team`).
> Связанные файлы: `.docs/database.md` (`User`, `UserRole`, `Event`), `.docs/modules/auth.md`, `.docs/modules/assignment.md`, `.docs/modules/platform-marketer.md` (прообраз self-service профиля).

---

## Что не изменилось

Одна таблица `User`, блокировка вместо удаления как основной путь, пароль задаёт администратор, защитные инварианты (нельзя удалить/заблокировать себя, нельзя удалить последнего администратора, email уникален глобально), события `USER_CREATED`/`USER_BLOCKED`/`USER_UNBLOCKED`/`USER_DELETED`. См. предыдущую версию документа.

---

## Что изменилось

### 1. Три роли при создании, без ограничения по количеству

Форма создания пользователя — выбор одной из трёх ролей (`MANAGER`/`HEAD`/`ADMIN`), не переключатель «менеджер/админ». Лимита на число пользователей нет ни в каком виде — тарифов не существует.

```typescript
// POST /api/users — без проверки лимита, есть только обычная валидация
async function createUser(companyId: string, data: { email: string; name: string; role: UserRole; password: string }) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new ValidationError("EMAIL_EXISTS");

  return prisma.user.create({
    data: { companyId, email: data.email.toLowerCase().trim(), name: data.name, role: data.role, passwordHash: await hashPassword(data.password) },
  });
}
```

**Кто может назначить роль `ADMIN` другому пользователю:** только существующий `ADMIN` — `HEAD` может создавать пользователей с ролью `MANAGER`/`HEAD`? **Нет** — управление пользователями (раздел 3.3 `prd.md`) целиком в компетенции `ADMIN`, `HEAD` эту страницу не видит вообще (защищено на уровне `/admin/*`, см. `CLAUDE.md`). Создаёт пользователей **любой** роли только Администратор.

### 2. Мутации — обычные проверки, без guard'а подписки

Создание/блокировка/разблокировка/удаление — обычные мутации с проверкой роли (`ADMIN only`) и видимости. Отдельного guard'а подписки не существует — биллинга в продукте нет.

### 3. Блокировка пользователя — не то же самое, что блокировка компании

Два независимых флага на двух разных уровнях:

```
User.isBlocked = true     → конкретный пользователь не может войти, остальные сотрудники компании работают как обычно
Company.isBlocked = true  → НИКТО из компании не может войти, независимо от User.isBlocked каждого отдельного пользователя
```

Первое — действие Администратора компании (этот модуль), второе — действие платформенного администратора (`.docs/modules/platform-admin.md`). Не путать в коде и в UI-текстах.

---

## Профиль пользователя (self-service)

Каждый пользователь компании (Менеджер/Руководитель/Администратор) редактирует свой профиль на `/profile` (доступна любой роли, кроме маркетолога — тот не входит в `constants/marketerAccess.ts` allow-list и редиректится на `/leads`). Зеркалит self-service профиль маркетолога (`.docs/modules/platform-marketer.md` → «Профиль маркетолога»), но на модели `User`, а не `PlatformAdmin`.

- Редактируемые поля: ФИО (`name`), телефон, Telegram (`@username`, обычный контактный хендл — не путать с `telegramChatId`, полем привязки Telegram-бота из Phase 13), Max, «Другой контакт». `email` не редактируется никем (идентификатор входа).
- Аватар — `POST/DELETE /api/users/me/avatar`, тот же S3-клиент, что и у маркетолога (`lib/s3.ts`, обобщён параметром `namespace: 'marketers' | 'users'`), ключ `avatars/users/{userId}/...`.
- Смена пароля — `PATCH /api/users/me/password`, self-service с проверкой текущего пароля (`comparePassword` из `lib/password.ts`); неверный текущий пароль → `400 { error: "INVALID_CURRENT_PASSWORD" }`.
- Настройки уведомлений — `PATCH /api/users/me/notification-preferences`, немедленное сохранение по каждому тумблеру (как `AssignModeSection`), пишет в существующее JSON-поле `User.notificationPreferences` (`{ assignedLead, commentOnLead, reminders }`). Строка «Telegram-бот» — кнопка привязки (`TelegramBindButton`, Phase 13): «Подключить» создаёт одноразовый deep-link (`POST /api/telegram/bind`) на общего бота платформы, `/start <token>` в боте проставляет `User.telegramChatId`; «Отключить» (`DELETE /api/telegram/bind`) очищает его. Тумблер `assignedLead` — реальный гейт Telegram-доставки нового лида, отдельного тумблера-мастера «Telegram включён» на уровне пользователя нет.
- Правки профиля/пароля/уведомлений **не пишут `Event`** — как и у профиля маркетолога, это самообслуживание, а не действие, которое нужно журналировать.

## Карточка сотрудника (`/team`, HEAD+)

Руководитель и Администратор видят список всех сотрудников компании (любая роль) на `/team` (группа `(management)`, `hasMinRole(role, "HEAD")`, как `/control`/`/reports`) и открывают карточку конкретного сотрудника по клику на строку (`/team/:id`).

- Карточка **только для просмотра** — те же данные, что видит сам сотрудник на `/profile` (аватар, ФИО, роль, email, телефон, Telegram, Max, другой контакт, дата регистрации, последний вход, статус блокировки), без формы редактирования и без кнопки блокировки (блокировка/смена роли остаются на `/admin/users`, ADMIN-only).
- `companyId`-скоуп обязателен при чтении карточки (`prisma.user.findUnique({ where: { id, companyId } })`) — иначе можно было бы подсмотреть карточку сотрудника чужой компании по id; несовпадение → `notFound()`.
- `/team` — самостоятельная страница, не расширение `/admin/users`: у неё другой минимальный порог доступа (HEAD, а не ADMIN) и другое назначение (обзор команды, а не управление учётками).

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/users` | Список пользователей компании | Session | ADMIN only |
| POST | `/api/users` | Создать пользователя (любая из трёх ролей) | Session | ADMIN only |
| PATCH | `/api/users/:id` | Блокировать/разблокировать/изменить роль | Session | ADMIN only |
| DELETE | `/api/users/:id` | Удалить (нельзя — последнего администратора/себя) | Session | ADMIN only |
| GET/PATCH | `/api/users/me` | Собственный профиль: чтение / редактирование (ФИО, телефон, соцконтакты) | Session | Любая роль (только `session.user`, не marketer) |
| POST/DELETE | `/api/users/me/avatar` | Загрузка/удаление собственного аватара (S3) | Session | Любая роль |
| PATCH | `/api/users/me/password` | Смена собственного пароля (с проверкой текущего) | Session | Любая роль |
| PATCH | `/api/users/me/notification-preferences` | Личные настройки уведомлений | Session | Любая роль |

### `POST /api/users`

**Request:** `{ "email": "...", "name": "...", "role": "HEAD", "password": "..." }`
**Response 400:** `{ "success": false, "error": "EMAIL_EXISTS" | "VALIDATION_ERROR" }`

---

## Файлы, которые создаются

```
app/
├── (admin)/admin/users/page.tsx
├── (app)/profile/page.tsx              # НОВОЕ — self-service профиль (любая роль)
├── (management)/team/page.tsx          # НОВОЕ — список сотрудников (HEAD+)
├── (management)/team/[id]/page.tsx     # НОВОЕ — карточка сотрудника, только просмотр (HEAD+)
└── api/
    └── users/
        ├── route.ts                   # GET, POST
        ├── [id]/route.ts              # PATCH, DELETE
        └── me/
            ├── route.ts                          # НОВОЕ — GET/PATCH собственного профиля
            ├── avatar/route.ts                   # НОВОЕ — POST/DELETE аватара (S3)
            ├── password/route.ts                 # НОВОЕ — PATCH смены пароля
            └── notification-preferences/route.ts # НОВОЕ — PATCH настроек уведомлений

components/
├── users/UsersTable.tsx (+ Add/Edit/DeleteUserModal)
├── profile/                            # НОВОЕ — Personal/Contacts/Security/Notifications/Sidebar/Footer
└── team/                               # НОВОЕ — TeamTable.tsx, TeamMemberDetail.tsx

lib/
├── validations/users.ts     # createUserSchema + updateOwnProfileSchema/changeOwnPasswordSchema/updateNotificationPreferencesSchema
├── users/profile.ts         # НОВОЕ — toUserProfileDetail + USER_PROFILE_SELECT (общий маппинг для /profile и /team/:id)
├── notifications/preferences.ts # НОВОЕ — parseNotificationPreferences (JSON → NotificationPreferences)
└── s3.ts                     # ПЕРЕЕЗД из lib/platform/s3.ts — общий S3-клиент аватаров (namespace 'marketers' | 'users')

types/users.ts                # НОВОЕ — UserProfileDetail, TeamMemberListItem, NotificationPreferences
```

---

## Серверные правила безопасности

1. **`companyId` из сессии, как везде.**
2. **Email lowercase + trim, уникален глобально.**
3. **Нельзя заблокировать/удалить самого себя.**
4. **Нельзя удалить/заблокировать последнего активного `ADMIN` компании** — иначе компания остаётся без единого администратора.
5. **Управление пользователями — только `ADMIN`**, проверяется через `hasMinRole(role, "ADMIN")` (фактически эквивалентно `role === "ADMIN"`, так как это высшая роль, но проверка всё равно идёт через общую функцию, не через сравнение строки).
6. **Роль, передаваемая в `POST`/`PATCH`, валидируется по enum `UserRole`** — невалидное значение отклоняется на уровне Zod, до похода в БД.
7. **`/api/users/me/*` работает только с `session.user.id` из сессии** — не принимает чужой `id` (guard — `requireCompanyUser` из `lib/auth/requireCompanyAccess.ts`, отсекает маркетолога 403-м, так как у него нет `session.user`).
8. **`/team/:id` скопирован по `companyId`** — чтение чужой компании по подобранному id невозможно (`prisma.user.findUnique({ where: { id, companyId } })` → `notFound()`).

---

## Связи с другими модулями

- **`.docs/modules/auth.md`** — вход, `User.isBlocked` И `Company.isBlocked` проверяются в `authorize()` (два разных флага, см. выше).
- **`.docs/modules/platform-admin.md`** — блокировка компании целиком — отдельный механизм, не этот модуль.
- **`.docs/modules/assignment.md`** — блокировка пользователя исключает его из round-robin и из `AssignmentRule` как получателя.
- **`.docs/modules/platform-marketer.md`** — раздел «Профиль маркетолога» — прямой прообраз self-service профиля из этого модуля (та же механика S3, тот же принцип «email не редактируется», тот же паттерн read-only карточки для наблюдающей роли).
- **`.docs/database.md`** — модель `User`, enum `UserRole` (`MANAGER`/`HEAD`/`ADMIN`), новые поля `phone`/`avatarUrl`/`telegram`/`max`/`otherContact`.
