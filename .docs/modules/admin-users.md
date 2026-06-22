# Модуль: Управление пользователями (admin-users)

> Спецификация управления пользователями компании. Базовая механика не изменилась; убран лимит по тарифу (тарифов не существует); добавлен выбор одной из трёх ролей при создании.
> Связанные файлы: `.docs/database.md` (`User`, `UserRole`, `Event`), `.docs/modules/auth.md`, `.docs/modules/assignment.md`.

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

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/users` | Список пользователей компании | Session | ADMIN only |
| POST | `/api/users` | Создать пользователя (любая из трёх ролей) | Session | ADMIN only |
| PATCH | `/api/users/:id` | Блокировать/разблокировать/изменить роль | Session | ADMIN only |
| DELETE | `/api/users/:id` | Удалить (нельзя — последнего администратора/себя) | Session | ADMIN only |

### `POST /api/users`

**Request:** `{ "email": "...", "name": "...", "role": "HEAD", "password": "..." }`
**Response 400:** `{ "success": false, "error": "EMAIL_EXISTS" | "VALIDATION_ERROR" }`

---

## Файлы, которые создаются

```
app/
├── (admin)/admin/users/page.tsx
└── api/
    └── users/
        ├── route.ts        # GET, POST
        └── [id]/route.ts   # PATCH, DELETE

components/
└── admin/users/
    ├── UsersTable.tsx
    ├── CreateUserModal.tsx   # выбор роли: Менеджер / Руководитель / Администратор
    └── BlockUserModal.tsx

lib/validations/
└── users.ts                  # createUserSchema с role: z.enum(["MANAGER", "HEAD", "ADMIN"])
```

---

## Серверные правила безопасности

1. **`companyId` из сессии, как везде.**
2. **Email lowercase + trim, уникален глобально.**
3. **Нельзя заблокировать/удалить самого себя.**
4. **Нельзя удалить/заблокировать последнего активного `ADMIN` компании** — иначе компания остаётся без единого администратора.
5. **Управление пользователями — только `ADMIN`**, проверяется через `hasMinRole(role, "ADMIN")` (фактически эквивалентно `role === "ADMIN"`, так как это высшая роль, но проверка всё равно идёт через общую функцию, не через сравнение строки).
6. **Роль, передаваемая в `POST`/`PATCH`, валидируется по enum `UserRole`** — невалидное значение отклоняется на уровне Zod, до похода в БД.

---

## Связи с другими модулями

- **`.docs/modules/auth.md`** — вход, `User.isBlocked` И `Company.isBlocked` проверяются в `authorize()` (два разных флага, см. выше).
- **`.docs/modules/platform-admin.md`** — блокировка компании целиком — отдельный механизм, не этот модуль.
- **`.docs/modules/assignment.md`** — блокировка пользователя исключает его из round-robin и из `AssignmentRule` как получателя.
- **`.docs/database.md`** — модель `User`, enum `UserRole` (`MANAGER`/`HEAD`/`ADMIN`).
