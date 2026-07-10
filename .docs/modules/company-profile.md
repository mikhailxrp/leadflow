# Модуль: Карточка компании (реквизиты)

> Самостоятельная правка (вне нумерации фаз). Страница `/company` (пункт сайдбара «Компания», ADMIN и HEAD, без разделения прав между ними) — компания сама заполняет свои реквизиты: логотип, контакты, адрес, форма регистрации, ФИО руководителя. Название компании на этой странице — только для чтения, его задаёт платформенный администратор/маркетолог при создании (`.docs/modules/platform-admin.md`). Эти же реквизиты видны только для чтения на платформенном уровне (`/platform/companies/:id`) обеим платформенным ролям.
> Связанные файлы: `.docs/database.md` (`Company`, `CompanyLegalForm`, `COMPANY_PROFILE_UPDATED`), `.docs/modules/admin-users.md` (прообраз self-service профиля/аватара), `.docs/modules/platform-admin.md`, `.docs/modules/platform-marketer.md`.

---

## Поля

| Поле | Обязательность | Тип |
| --- | --- | --- |
| `logoUrl` | Необязательно | S3-URL (`lib/s3.ts`, `namespace: 'companies'`, лимит 3 МБ, JPEG/PNG/WEBP) |
| `name` | Только чтение на `/company` | Задаётся при создании компании платформенным уровнем |
| `phone` | **Обязательно** (на уровне Zod-формы, не БД) | Строка |
| `email` | **Обязательно** (на уровне Zod-формы, не БД) | Валидный email |
| `address` | Необязательно | Строка |
| `legalForm` | Необязательно | Enum `CompanyLegalForm` (ИП/ООО/АО/ПАО/НКО/Самозанятый/Другое) — фиксированный список, не свободный текст |
| `directorName` | Необязательно | Свободный текст — юридический реквизит («ФИО Руководителя»), **не привязан** к пользователю с ролью `HEAD` в CRM: у компании может не быть HEAD-пользователя вовсе, а генеральный директор по документам может отличаться от того, кто фактически работает в CRM |

Все шесть полей в БД — nullable (миграция аддитивная). У компаний, созданных до этой правки, они пустые до первого заполнения — обязательность `phone`/`email` не ретроактивна и не блокирует работу компании, только сохранение формы `/company` без них.

---

## Доступ

- **Видит и редактирует:** `ADMIN` и `HEAD` — `hasMinRole(role, 'HEAD')`, без различий в правах между ними (как `/control`/`/reports`/`/team`). `MANAGER` пункт меню не видит.
- **Маркетолог в режиме входа внутрь компании** (`marketer-access`, `.docs/modules/platform-marketer.md`) страницу `/company` не видит — она не добавлена в `constants/marketerAccess.ts` (allow-list, deny-by-default). API `/api/company*` защищён `requireCompanyUser({ minRole: 'HEAD' })`, а не `requireCompanyAccess`, поэтому у маркетолога нет `session.user` и запрос получает `403` независимо от allow-list.
- **Платформенный уровень** (`SUPER_ADMIN`/`MARKETER`) видит реквизиты только для чтения на `/platform/companies/:id` — формы редактирования там нет и не будет: правки реквизитов — исключительно самообслуживание компании.

---

## Сохранение

- `PATCH /api/company` — `phone`/`email` обязательны в каждом вызове (форма не поддерживает частичное сохранение обязательных полей), `address`/`legalForm`/`directorName` — опциональны, пустая строка нормализуется в `null`.
- Пишет событие `COMPANY_PROFILE_UPDATED { fields: string[] }` — список изменённых ключей, видно в `/platform/logs`.
- Логотип сохраняется отдельно и немедленно (`POST/DELETE /api/company/logo`), без общей формы/футера «Сохранить» — тот же UX, что у аватара пользователя (`ProfileSidebar`/`avatar/route.ts`).
- Правки полей формы **не сохраняются построчно** — общий футер «Сохранить»/«Отмена» с dirty-tracking, как self-service профиль пользователя (`ProfileLayout`/`ProfileFooter`), не как тумблеры `/admin/settings`.

---

## API-эндпоинты

| Метод | Путь | Назначение | Право |
| --- | --- | --- | --- |
| GET | `/api/company` | Реквизиты своей компании | `hasMinRole(role, 'HEAD')` |
| PATCH | `/api/company` | Обновить реквизиты (`phone`/`email` обязательны) | `hasMinRole(role, 'HEAD')` |
| POST | `/api/company/logo` | Загрузить/заменить логотип (S3) | `hasMinRole(role, 'HEAD')` |
| DELETE | `/api/company/logo` | Удалить логотип | `hasMinRole(role, 'HEAD')` |

---

## Файлы

```
app/
├── (company)/(management)/company/page.tsx   # НОВОЕ — форма реквизитов (HEAD+)
└── api/company/
    ├── route.ts        # НОВОЕ — GET/PATCH
    └── logo/route.ts   # НОВОЕ — POST/DELETE

components/company/
├── CompanyProfileForm.tsx     # НОВОЕ — форма с dirty-tracking + footer
└── CompanyLogoUploader.tsx    # НОВОЕ — загрузка/удаление логотипа (immediate save)

lib/
├── company/profile.ts       # НОВОЕ — COMPANY_PROFILE_SELECT + toCompanyProfileDetail
└── validations/company.ts   # НОВОЕ — updateCompanyProfileSchema

constants/legalForms.ts      # НОВОЕ — LEGAL_FORM_LABELS/LEGAL_FORM_OPTIONS
types/company.ts             # НОВОЕ — CompanyProfileDetail
```

Платформенная сторона (существующие файлы, только правки): `types/platform.ts` (`PlatformCompanyDetail` — 6 новых полей), `app/(platform)/platform/companies/[id]/page.tsx` (`loadCompanyDetail` — select + return), `components/platform/CompanyDetailPageClient.tsx` (секция «Реквизиты компании», read-only, видна и `SUPER_ADMIN`, и `MARKETER`).

---

## Связи с другими модулями

- **`.docs/modules/admin-users.md`** — self-service профиль пользователя (`/profile`) и его аватар — прямой прообраз этой страницы (тот же `lib/s3.ts`, тот же паттерн dirty-tracking + footer).
- **`.docs/modules/platform-admin.md`** / **`.docs/modules/platform-marketer.md`** — карточка компании на платформенном уровне теперь показывает реквизиты, заполняемые самой компанией, а не платформенным администратором/маркетологом (они по-прежнему управляют только именем при создании, блокировкой и датой платежа).
- **`.docs/database.md`** — модель `Company`, enum `CompanyLegalForm`, событие `COMPANY_PROFILE_UPDATED`.
