# Модуль: Маркетолог (platform-marketer)

> Спецификация роли «Маркетолог» — урезанной роли платформенного уровня. Маркетолог создаёт компании и отвечает за них, входит внутрь своих компаний в режиме ограниченного доступа (квалификация лидов, аналитика, интеграции), но не управляет платформенными пользователями и не видит чужие компании.
> Связанные файлы: `.docs/modules/platform-admin.md` (базовый платформенный уровень), `.docs/database.md` (`PlatformRole`, `Company.createdByPlatformAdminId`, `CompanyAccessGrant`, `Lead.qualification`), `CLAUDE.md` (пять уровней доступа, правило allow-list).

---

## Содержание

1. Цели модуля
2. Архитектурные решения
3. Роль на платформенном уровне: `PlatformRole`
4. Владение компаниями и видимость
5. Предоставление доступа к компании (гранты)
6. Блокировка маркетолога — каскадная
7. Вход маркетолога внутрь компании (marketer-доступ)
8. Allow-list прав маркетолога внутри компании
9. Квалификация лидов
10. Логи (платформенный уровень)
11. API-эндпоинты
12. Файлы, которые создаются/изменяются
13. Серверные правила безопасности
14. Связи с другими модулями

---

## Цели модуля

После завершения этого модуля:

- Платформенный администратор может создать маркетолога и заблокировать его
- Маркетолог входит через тот же `/platform/login`, получает сессию `kind: "platform"` со своей ролью
- Маркетолог создаёт компании и видит **только свои** (созданные им + предоставленные грантом), включая их `companyId`
- Маркетолог управляет своими компаниями тем же набором, что и платформенный администратор своими: блокировка/разблокировка, дата платежа, активность
- Маркетолог входит внутрь своих компаний в ограниченном режиме: лиды (просмотр + квалификация), воронка (просмотр), отчёты, интеграции
- Блокировка маркетолога каскадно блокирует его компании; платформенные администраторы получают email с контактами администраторов заблокированных компаний
- Квалификация лида — статус + событие; позже экспортируется в Яндекс Метрику через API (Phase 22.5)
- И маркетолог, и платформенный администратор видят страницу логов `/platform/logs` в рамках своей видимости

**Не входит в модуль:**

- Сам экспорт в Яндекс Метрику (API офлайн-конверсий) → Phase 22.5, после research
- Работа маркетолога с лидами как менеджера (взять в работу, назначить, закрыть, удалить) — **запрещена по определению роли**
- Изменение чего-либо в ролях внутри компании (`MANAGER`/`HEAD`/`ADMIN`) — иерархия компании не затрагивается

---

## Архитектурные решения

### 1. Маркетолог — строка в `PlatformAdmin` с ролью, не отдельная таблица

Третья таблица и третий `session.kind` умножили бы попарные проверки типов сессии в каждом хендлере (главный инвариант проекта — «два типа сессии никогда не смешиваются»). Вместо этого — enum `PlatformRole { SUPER_ADMIN, MARKETER }` и поле `PlatformAdmin.role`. Маркетолог бесплатно получает существующий логин, восстановление пароля, `isActive`/`deletedAt`.

**`SUPER_ADMIN` и `MARKETER` — не иерархия.** В отличие от ролей компании (`hasMinRole`), платформенные роли — два разных скоупа, ни один не является надмножеством другого: суперадмин не видит `companyId` компаний маркетолога, маркетолог не управляет платформенными пользователями. Проверка — всегда явная по ролям, которым эндпоинт разрешён: `requirePlatformSession({ roles: ["SUPER_ADMIN"] })`.

### 2. Владение компанией — поле, а не «кто что помнит»

`Company.createdByPlatformAdminId` (nullable). Все правила видимости и управления выводятся из владения + грантов, детерминированно (раздел 4).

### 3. Маркетолог внутри компании — виртуальный actor с allow-list, не impersonation реального `User`

Права маркетолога внутри компании **не ложатся в линейную иерархию** `MANAGER < HEAD < ADMIN`: ему нужны отчёты (уровень HEAD) и интеграции (уровень ADMIN), но запрещены действия с лидами, доступные даже MANAGER. Поэтому маркетолог — единственный actor сессии `kind: "company"` без реальной записи `User`, с **явным allow-list** разрешённого (раздел 8). Всё, чего нет в allow-list, — запрещено: новые эндпоинты будущих фаз безопасны по умолчанию.

Impersonation реального `User` остаётся исключительно инструментом суперадмина (для его компаний) — этот механизм не изменяется.

### 4. Скрытие `companyId` от суперадмина — UX-барьер, не безопасность

`companyId` компаний маркетолога скрыт в платформенном UI суперадмина, и вход «как поддержка» в них возможен только по вручную предоставленному `companyId`. Но `companyId` присутствует в URL вебхуков (`/api/webhooks/tilda/[companyId]`) и известен каждому клиенту, а любой вход суперадмина логируется (`PLATFORM_IMPERSONATION_STARTED`). На этом скрытии не строятся гарантии конфиденциальности — это организационная граница ответственности, зафиксированная в UI.

**Реализация «предоставленного `companyId`»:**
- Маркетолог видит `companyId` своей компании на её карточке (`/platform/companies/:id`, поле «ID» с кнопкой «Скопировать» в `CompanyDetailPageClient.tsx`) — оттуда он передаёт его суперадмину вне системы (чат поддержки и т.п.). Та же карточка показывает и реквизиты компании (логотип/контакты/адрес/форма регистрации/ФИО руководителя), заполняемые самой компанией на `/company` — только для чтения, см. `.docs/modules/company-profile.md`.
- Суперадмин переходит по нему через форму «Войти в компанию по ID» на `/platform/companies` (`GoToCompanyById` в `CompaniesPageClient.tsx`) → попадает на `/platform/companies/:id` (доступно всегда: `visibilityWhere` для `SUPER_ADMIN` — `{}`, т.е. по id открывается любая компания).
- **`canImpersonate` на этой странице проверяет только `viewerRole === 'SUPER_ADMIN'`, не `company.manageable`.** Это осознанно: `manageable` управляет блокировкой/датой платежа (только платформенные компании), а impersonation для суперадмина разрешён и на компании маркетолога — именно ради сценария «войти по предоставленному id». Не добавляй обратно `&& company.manageable` в это условие — это отключит вход именно в компании маркетологов, которые сюда и приходят только через ручной `companyId`.

---

## Роль на платформенном уровне: `PlatformRole`

```prisma
enum PlatformRole {
  SUPER_ADMIN   // полный платформенный набор + управление платформенными пользователями
  MARKETER      // свои компании + ограниченный вход внутрь них
}

model PlatformAdmin {
  // ... существующие поля
  role PlatformRole @default(SUPER_ADMIN)
}
```

Дефолт `SUPER_ADMIN` — существующие записи и bootstrap-скрипт продолжают работать без изменений. Роль попадает в JWT и в `session.admin.role`.

```typescript
// types/session.ts — обновлённая платформенная сессия
export type PlatformSession = {
  kind: "platform";
  admin: {
    id: string;
    email: string;
    role: PlatformRole;
  };
  user?: never;
};
```

**Guard:** `requirePlatformSession({ roles })` — существующий `requirePlatformSession()` расширяется параметром допустимых ролей. **Все существующие эндпоинты `/api/platform/*` при внедрении явно получают список ролей** — эндпоинт без явного списка считается багом (иначе маркетолог получил бы полный доступ по умолчанию).

### Сравнение возможностей

| Возможность | SUPER_ADMIN | MARKETER |
| --- | --- | --- |
| Создание компаний | Да | Да |
| Список компаний | Все (у компаний маркетологов скрыт `companyId`, нет кнопки входа) | Только свои + гранты, с `companyId` |
| Блокировка/разблокировка компании | Своих (платформенных) | Своих |
| Дата платежа (`nextPaymentAt`) | Своих (платформенных) | Своих |
| Email-дайджест продлений | По платформенным компаниям | По своим компаниям |
| Активность компаний | Платформенные компании + активность маркетологов | Свои компании |
| Impersonation реального `User` | Да, в свои компании (+ по предоставленному `companyId`) | **Нет — никогда** |
| Вход внутрь компании как маркетолог (allow-list) | Нет (у него impersonation) | Да, в свои + гранты |
| Создание платформенных администраторов | Да | Нет |
| Создание/блокировка маркетологов | Да | Нет |
| Предоставление грантов на свои компании | Да | Нет |
| Логи `/platform/logs` | По своей видимости | По своим компаниям + путь лида |

---

## Владение компаниями и видимость

```prisma
model Company {
  // ... существующие поля
  createdByPlatformAdminId String?
  blockedByMarketerCascade Boolean @default(false)
}
```

**Правила владения:**

```
createdByPlatformAdminId = null            → «платформенная» компания (создана до v4.1 или суперадмином без записи владельца)
createdByPlatformAdminId = id суперадмина  → «платформенная» компания
createdByPlatformAdminId = id маркетолога  → компания маркетолога
```

- **Платформенные компании** видимы и управляемы **всеми** суперадминами одинаково (между суперадминами конфиденциальности нет — граница проходит между суперадминами и маркетологами).
- **Компании маркетолога** видимы полностью (с `companyId` и управлением) только этому маркетологу. Суперадмин видит их в общем списке (название, статус, активность как сигнал «живая/мёртвая»), но без `companyId`, без кнопок управления и impersonation — войти он может только по вручную предоставленному `companyId` (архитектурное решение 4).
- `createCompany()` всегда записывает `createdByPlatformAdminId` из сессии — новых «ничьих» компаний не появляется.

---

## Предоставление доступа к компании (гранты)

Суперадмин может предоставить выбранному маркетологу доступ к **своей** (платформенной) компании — например, чтобы маркетолог вёл квалификацию лидов клиента, которого подключала платформа.

```prisma
model CompanyAccessGrant {
  id                String   @id @default(cuid())
  companyId         String
  platformAdminId   String   // маркетолог-получатель
  grantedById       String   // суперадмин, выдавший грант
  createdAt         DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, platformAdminId])
  @@index([platformAdminId])
}
```

**Что даёт грант маркетологу:** компания появляется в его списке (с `companyId`), доступны вход внутрь (allow-list), активность и логи по ней.
**Чего грант НЕ даёт:** управления (блокировка, дата платежа) — они остаются за владельцем-суперадмином. Грантованная компания не попадает в дайджест продлений маркетолога и не блокируется каскадом при его блокировке.

Выдача/отзыв — только суперадмином, только на платформенные компании. События: `COMPANY_ACCESS_GRANTED` / `COMPANY_ACCESS_REVOKED` `{ marketerId, byPlatformAdminId }`.

---

## Блокировка маркетолога — каскадная

Маркетолог сам отвечает за работоспособность системы для созданных им компаний. Поэтому его блокировка останавливает и его компании — но с уведомлением платформы, чтобы клиенты не остались брошенными молча.

### Поведение

```
PATCH /api/platform/marketers/:id { isActive: false }
  → транзакция:
     - PlatformAdmin.isActive = false (вход маркетолога запрещён со следующей проверки сессии)
     - для каждой компании маркетолога с isBlocked = false:
         Company.isBlocked = true
         Company.blockedByMarketerCascade = true
         событие COMPANY_BLOCKED { byPlatformAdminId, cascade: true }
  → после коммита: email всем активным SUPER_ADMIN — список заблокированных компаний
    + контакты их администраторов (User с ролью ADMIN: имя, email каждой компании)
  → приём лидов по вебхукам всех этих компаний ПРОДОЛЖАЕТ работать (инвариант «лид нельзя потерять»)
```

Компании, которые маркетолог заблокировал вручную **до** своей блокировки, не помечаются каскадом — они остаются заблокированными и после его разблокировки.

### Разблокировка

```
PATCH /api/platform/marketers/:id { isActive: true }
  → транзакция:
     - PlatformAdmin.isActive = true
     - для каждой компании маркетолога с blockedByMarketerCascade = true:
         Company.isBlocked = false
         Company.blockedByMarketerCascade = false
         событие COMPANY_UNBLOCKED { byPlatformAdminId, cascade: true }
```

Ручная блокировка/разблокировка компании (владельцем) всегда сбрасывает `blockedByMarketerCascade = false` — ручное решение перекрывает каскадное.

### Письмо о каскадной блокировке

`lib/platform/sendCascadeBlockEmail.ts` — всем активным `SUPER_ADMIN`; по каждой компании: название, дата блокировки, список администраторов (имя + email). Graceful skip при не настроенном SMTP (как в дайджесте продлений). Цель письма — платформа знает, с кем связаться по осиротевшим клиентам.

---

## Вход маркетолога внутрь компании (marketer-доступ)

Механика зеркалит impersonation (короткоживущий одноразовый токен → отдельный credentials-провайдер → сессия `kind: "company"`), но создаётся **виртуальный actor без `User`**:

```
1. Маркетолог в списке своих компаний нажимает «Войти в компанию»
2. POST /api/platform/companies/:companyId/marketer-access
   → проверка: сессия kind: "platform" + role MARKETER + компания своя или грант
   → одноразовый токен (TTL 60 сек, in-memory, как impersonation)
   → событие MARKETER_ACCESS_STARTED { companyId, platformAdminId }
3. Провайдер 'marketer-access' обменивает токен на сессию:
   { kind: "company", actor: "marketer", marketer: { platformAdminId, companyId } }
4. Редирект на /leads (не /today — «Сегодня» это рабочий экран менеджера, маркетологу недоступен)
5. Постоянный баннер: «Вы вошли как маркетолог — {компания}» + кнопка «Выйти»
6. Любое разрешённое действие пишет событие с userId = null,
   помеченное impersonatedByPlatformAdminId = id маркетолога (переиспользуется существующая аннотация)
7. POST /api/platform/marketer-access/end → MARKETER_ACCESS_ENDED,
   restore-токен возвращает платформенную сессию, редирект на /platform/companies
```

```typescript
// types/session.ts — company-сессия становится объединением двух actor'ов
export type CompanySession =
  | {
      kind: "company";
      user: {
        id: string;
        companyId: string;
        role: UserRole;
        impersonatedByPlatformAdminId?: string;
      };
      marketer?: never;
    }
  | {
      kind: "company";
      marketer: {
        platformAdminId: string;
        companyId: string;
      };
      user?: never;
    };
```

TypeScript-объединение — сознательный выбор: каждый route handler, обращающийся к `session.user`, обязан сузить тип и тем самым явно решить судьбу маркетолога (обычно — отказ, если эндпоинта нет в allow-list; централизуется guard-хелпером из раздела 8).

**`userId = null` в событиях маркетолога** — маркетолог не пользователь компании, подставлять чужой `User.id` означало бы врать в истории. `Event.userId` изначально nullable, отображение в истории лида: «Маркетолог (платформа)».

---

## Allow-list прав маркетолога внутри компании

Единственный источник правды — `constants/marketerAccess.ts`. Проверка централизована в guard-хелпере (`lib/auth/requireCompanyAccess.ts`): для обычного пользователя делегирует в `hasMinRole`, для маркетолога — сверяет с allow-list. **Правило по умолчанию — запрещено:** эндпоинт/страница, не перечисленные явно, возвращают 403/redirect.

### Страницы (проверяются в `proxy.ts`)

| Путь | Доступ маркетолога |
| --- | --- |
| `/leads`, `/leads/:id` | Да — просмотр + квалификация |
| `/pipeline` | Да — только просмотр (drag-and-drop отключён) |
| `/reports` | Да (появится в Phase 21) |
| `/admin/integrations` | Да (появится в Phase 18) |
| `/today`, `/control`, `/team`, `/company`, `/admin/users`, `/admin/settings`, `/admin/pipeline-settings`, `/admin/import` | Нет → redirect на `/leads` |

### API

| Эндпоинт | Доступ |
| --- | --- |
| `GET /api/leads`, `GET /api/leads/:id`, `GET /api/leads/:id/duplicates` | Да (видимость — все лиды компании, как HEAD) |
| `PATCH /api/leads/:id/qualification` | Да — единственное мутирующее действие с лидом |
| `GET /api/pipeline/board` | Да |
| `GET /api/stages`, `GET /api/loss-reasons` | Да (справочники для отображения) |
| `GET /api/reports/*` | Да |
| `GET/POST/DELETE /api/api-keys`, `GET /api/admin/integrations/health` | Да — «настраивает интеграции» |
| Эндпоинты интеграции с Метрикой (Phase 22.5) | Да |
| `DELETE /api/leads/:id`, `POST /api/leads/:id/take`, `PATCH /api/leads/:id/assign`, `POST /api/leads/:id/close`, `POST /api/leads` | **Нет — явные запреты из определения роли** |
| Всё остальное (задачи, напоминания, комментарии-POST, импорт, пользователи, настройки, этапы CRUD, `PATCH /api/leads/:id`) | Нет (deny-by-default) |

Смена этапа лида маркетологом на доске запрещена (воронка — только просмотр): `PATCH` смены этапа не входит в allow-list, UI отключает drag.

---

## Квалификация лидов

Назначение — обучение рекламных систем (Яндекс Метрика): маркетолог помечает лид как целевой/нецелевой, позже пометки выгружаются как офлайн-конверсии.

```prisma
enum LeadQualification {
  QUALIFIED      // целевой
  DISQUALIFIED   // нецелевой
}

model Lead {
  // ... существующие поля
  qualification LeadQualification?
  qualifiedAt   DateTime?
}
```

- `null` — лид не оценён (дефолт для всех существующих и новых лидов).
- **Квалификация независима от воронки и закрытия** — это маркетинговая оценка качества обращения, не статус продажи. Лид может быть `QUALIFIED` и закрыт отказом, и наоборот.
- Кто может квалифицировать: **маркетолог** (allow-list) и **любой пользователь компании** (MANAGER/HEAD/ADMIN) — менеджер работает с лидами больше всех и первым понимает их качество.

```
PATCH /api/leads/:id/qualification { qualification: "QUALIFIED" | "DISQUALIFIED" | null }
  → обновляет Lead.qualification (+ qualifiedAt = now(), при null — сброс обоих полей)
  → событие LEAD_QUALIFIED | LEAD_DISQUALIFIED { qualification }
    (userId = реальный пользователь или null + аннотация маркетолога; сброс — LEAD_UPDATED { qualification: null })
```

UI: бейдж/переключатель в карточке лида и колонке списка лидов. Экспорт в Метрику — Phase 22.5 (research: API офлайн-конверсий, OAuth-токен, `counterId` в настройках интеграций компании).

---

## Логи (платформенный уровень)

Новая страница `/platform/logs` — просмотр журнала `Event` по компаниям в рамках видимости роли. Изначально показываются **только фильтры**, без данных — выборка выполняется после выбора компании (события — большая таблица, «показать всё» не существует).

| Роль | Видимость | Возможности |
| --- | --- | --- |
| SUPER_ADMIN | Платформенные компании | Фильтры: компания (обязателен), тип события, период, пагинация |
| MARKETER | Свои + гранты | Те же фильтры + режим «путь лида»: фильтр по лидам, таймлайн всех событий одного лида |

```
GET /api/platform/logs?companyId=...&leadId=...&type=...&from=...&to=...&page=...
  → guard: requirePlatformSession({ roles: ["SUPER_ADMIN", "MARKETER"] })
  → companyId обязателен и проверяется на принадлежность видимости роли (403 при чужой компании)
  → выборка из Event с фильтрами, маппинг подписей — constants/eventLabels.ts (переиспользуется)
```

Новых таблиц нет. Композитный индекс `@@index([companyId, createdAt])` на `Event` — по необходимости (существующие раздельные индексы могут быть достаточны, решается при реализации).

---

## Профиль маркетолога (карточка + самообслуживание)

Профиль маркетолога (ФИО, телефон, email, аватар, соцсети Telegram/VK/Max) **редактирует только сам маркетолог**, на собственной странице `/platform/profile` — платформенный уровень не имеет отдельного бэкдора для правки чужих контактных данных, тем же принципом, что и запрет прямого доступа к паролям клиентов (см. `CLAUDE.md`).

- `SUPER_ADMIN` открывает `/platform/marketers/:id` кликом по строке в `/platform/marketers` — карточка **только для просмотра**: аватар, ФИО, телефон, email, соцсети, статус, два списка компаний (созданные — `Company.createdByPlatformAdminId`, и грантованные — `CompanyAccessGrant`). Единственное доступное здесь действие — блокировка/разблокировка (`PATCH /api/platform/marketers/:id`, каскад не меняется).
- `MARKETER` открывает `/platform/profile` (пункт «Профиль» в сайдбаре, виден только этой роли) — та же карточка, но с возможностью редактировать ФИО/телефон/соцсети и загружать/менять/удалять аватар. `email` не редактируется никем (идентификатор входа).
- `PlatformAdmin` получает nullable-поля `phone`/`avatarUrl`/`telegram`/`vk`/`max` (аддитивная миграция, существующие маркетологи — `null`).
- `phone` обязателен только в форме создания маркетолога (`createMarketerSchema`, заполняет `SUPER_ADMIN` при регистрации) — не бэкофиллится для уже существующих записей.
- Редактирование профиля — `PATCH /api/platform/profile` (без `:id` в пути, действует на `session.admin.id`), `requirePlatformSession({ roles: ["MARKETER"] })`. Аватар — `POST`/`DELETE /api/platform/profile/avatar`, та же роль и тот же принцип «только свой `id`». Оба эндпоинта намеренно отделены от `PATCH /api/platform/marketers/:id` (тот только каскадная блокировка) и не принимают чужой `id` — self-service, не admin-edit.
- Аватар грузится через `lib/platform/s3.ts` — тонкий клиент над `@aws-sdk/client-s3` с настраиваемым `endpoint`/`region`/`bucket`, работает с любым S3-совместимым хранилищем (Beget Cloud Storage и другие). Загрузка — multipart, вручную проверяет MIME (`image/jpeg`/`image/png`/`image/webp`) и размер (≤3 МБ), не через Zod (бинарные данные).
- ENV-переменные хранилища (`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE`) — см. `CLAUDE.md` → Environment Variables и `.env.example`; при отсутствии ENV загрузка аватара отвечает `503`, остальная карточка работает нормально.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth (`kind: "platform"`, роли) |
| --- | --- | --- | --- |
| GET/POST | `/api/platform/marketers` | Список / создание маркетологов | SUPER_ADMIN |
| PATCH | `/api/platform/marketers/:id` | Блокировка/разблокировка (каскад) | SUPER_ADMIN |
| GET/POST | `/api/platform/companies/:id/grants` | Гранты компании: список / выдать | SUPER_ADMIN (компания — платформенная) |
| DELETE | `/api/platform/companies/:id/grants/:marketerId` | Отозвать грант | SUPER_ADMIN |
| POST | `/api/platform/companies/:id/marketer-access` | Вход маркетолога внутрь компании | MARKETER (своя или грант) |
| POST | `/api/platform/marketer-access/end` | Завершение marketer-доступа | `kind: "company"` + actor `marketer` |
| GET | `/api/platform/logs` | Журнал событий по фильтрам | SUPER_ADMIN, MARKETER (скоуп по видимости) |
| GET | `/api/platform/marketers/:id` | Детальная карточка маркетолога (профиль + компании + гранты), только просмотр | SUPER_ADMIN |
| PATCH | `/api/platform/profile` | Редактирование собственного профиля (ФИО/телефон/соцсети) | MARKETER (только `session.admin.id`) |
| POST/DELETE | `/api/platform/profile/avatar` | Загрузка/удаление собственного аватара (S3) | MARKETER (только `session.admin.id`) |
| PATCH | `/api/leads/:id/qualification` | Квалификация лида | `kind: "company"`: любая роль (MANAGER+) или actor `marketer` |

**Изменяемые существующие эндпоинты** (все получают явный список ролей):

| Путь | Было | Становится |
| --- | --- | --- |
| `GET/POST /api/platform/companies` | любая платформенная сессия | SUPER_ADMIN + MARKETER; список и создание скоупятся по владению |
| `PATCH /api/platform/companies/:id` | любая платформенная сессия | владелец компании (суперадмины — платформенные, маркетолог — свои) |
| `POST /api/platform/companies/:id/impersonate/:userId` | любая платформенная сессия | только SUPER_ADMIN |
| `GET/POST /api/platform/admins` | любая платформенная сессия | только SUPER_ADMIN |
| `GET /api/platform/activity` | любая платформенная сессия | SUPER_ADMIN + MARKETER, скоуп по видимости; для SUPER_ADMIN — вкладка активности маркетологов (`PlatformAdmin.lastLoginAt`) |
| `GET/POST /api/platform/cron/subscription-reminders` | `CRON_SECRET` | без изменений auth; дайджест группируется по владельцу: каждому активному платформенному пользователю — только его компании |

---

## Файлы, которые создаются/изменяются

```
app/
├── (platform)/platform/
│   ├── marketers/page.tsx              # НОВОЕ — список/создание/блокировка маркетологов (SUPER_ADMIN)
│   ├── marketers/[id]/page.tsx         # НОВОЕ — карточка маркетолога: профиль/аватар/компании, только просмотр (SUPER_ADMIN)
│   ├── profile/page.tsx                # НОВОЕ — собственный профиль маркетолога: редактирование + аватар (MARKETER)
│   ├── logs/page.tsx                   # НОВОЕ — журнал по фильтрам (обе роли, скоуп)
│   ├── companies/page.tsx              # ИЗМЕНЯЕТСЯ — скоупинг списка, скрытие companyId, вход по companyId
│   ├── companies/[id]/page.tsx         # ИЗМЕНЯЕТСЯ — гранты, кнопка marketer-входа
│   └── activity/page.tsx               # ИЗМЕНЯЕТСЯ — скоуп + вкладка активности маркетологов
└── api/
    ├── platform/
    │   ├── marketers/route.ts                        # НОВОЕ
    │   ├── marketers/[id]/route.ts                   # НОВОЕ (GET детальная карточка, только просмотр + PATCH каскадная блокировка)
    │   ├── profile/route.ts                          # НОВОЕ (PATCH собственного профиля, MARKETER)
    │   ├── profile/avatar/route.ts                   # НОВОЕ (POST/DELETE собственного аватара, S3, MARKETER)
    │   ├── companies/[id]/grants/route.ts            # НОВОЕ
    │   ├── companies/[id]/grants/[marketerId]/route.ts # НОВОЕ
    │   ├── companies/[id]/marketer-access/route.ts   # НОВОЕ
    │   ├── marketer-access/end/route.ts              # НОВОЕ
    │   └── logs/route.ts                             # НОВОЕ
    └── leads/[id]/qualification/route.ts             # НОВОЕ

lib/
├── auth/requireCompanyAccess.ts        # НОВОЕ — единый guard: hasMinRole ИЛИ allow-list маркетолога
└── platform/
    ├── auth.ts                         # ИЗМЕНЯЕТСЯ — requirePlatformSession({ roles })
    ├── companyVisibility.ts            # НОВОЕ — where-скоупы владения/грантов для обеих ролей
    ├── marketerAccess.ts               # НОВОЕ — токены входа (по образцу impersonate.ts)
    ├── cascadeBlock.ts                 # НОВОЕ — транзакции каскадной блокировки/разблокировки
    ├── sendCascadeBlockEmail.ts        # НОВОЕ
    ├── createCompany.ts                # ИЗМЕНЯЕТСЯ — createdByPlatformAdminId из сессии
    ├── subscriptionReminders.ts        # ИЗМЕНЯЕТСЯ — дайджест по владельцу
    └── s3.ts                           # НОВОЕ — S3-совместимый клиент (аватары маркетологов)

constants/
└── marketerAccess.ts                   # НОВОЕ — allow-list страниц и эндпоинтов

components/platform/
├── MarketersTable.tsx / CreateMarketerModal.tsx      # НОВОЕ
├── MarketerDetailPageClient.tsx                      # НОВОЕ — карточка маркетолога, только просмотр (SUPER_ADMIN)
├── MarketerProfileClient.tsx                         # НОВОЕ — собственный профиль: редактирование + аватар (MARKETER)
├── CompanyGrantsSection.tsx                          # НОВОЕ
├── PlatformLogsFilters.tsx / PlatformLogsTable.tsx   # НОВОЕ
└── MarketerBanner.tsx                                # НОВОЕ — баннер внутри компании

proxy.ts                                # ИЗМЕНЯЕТСЯ — маршруты company-зоны для actor "marketer"
types/session.ts                        # ИЗМЕНЯЕТСЯ — PlatformRole в admin, union actor'ов company-сессии
prisma/                                 # миграция: PlatformRole, role, lastLoginAt, createdByPlatformAdminId,
                                        # blockedByMarketerCascade, CompanyAccessGrant, LeadQualification,
                                        # qualification/qualifiedAt, новые EventType
```

---

## Серверные правила безопасности

1. **Каждый `/api/platform/*`-эндпоинт объявляет допустимые платформенные роли явно** — `requirePlatformSession({ roles })` без списка ролей не существует. `SUPER_ADMIN` и `MARKETER` — не иерархия, `hasMinRole` к ним неприменим.
2. **Права маркетолога внутри компании — allow-list, deny-by-default.** Единственный источник правды — `constants/marketerAccess.ts`; эндпоинт, не перечисленный там, отвечает маркетологу 403 без дополнительного кода.
3. **Маркетолог никогда не impersonate'ит реального `User`** — его company-сессия всегда виртуальный actor `marketer` с `userId = null` в событиях и аннотацией `impersonatedByPlatformAdminId`.
4. **Видимость компаний — через `lib/platform/companyVisibility.ts`**, не ручные `where` в каждом роуте: владение + гранты в одном месте.
5. **Скрытие `companyId` от суперадмина — не гарантия безопасности** (архитектурное решение 4): `companyId` известен клиенту из URL вебхуков; настоящая защита — журналирование каждого входа.
6. **Каскадная блокировка — транзакция + обязательный email**; ручная блокировка/разблокировка компании владельцем всегда сбрасывает `blockedByMarketerCascade`.
7. **Каскадная блокировка не останавливает приём лидов** — инвариант «лид нельзя потерять» действует без исключений.
8. **Гранты выдаёт только суперадмин и только на платформенные компании** — маркетолог не может «поделиться» своей компанией.
9. **Квалификация не влияет на воронку, назначение и эскалацию** — параллельная маркетинговая пометка, никак не блокирующая работу с лидом.

---

## Связи с другими модулями

- **`.docs/modules/platform-admin.md`** — базовый платформенный уровень; этот модуль сужает существующие эндпоинты (`roles`) и добавляет скоупинг видимости. Impersonation, создание компаний, дата платежа, дайджест — механика без изменений, меняется только «кто и на какие компании».
- **`.docs/database.md`** — `PlatformRole`, `Company.createdByPlatformAdminId`/`blockedByMarketerCascade`, `CompanyAccessGrant`, `Lead.qualification`/`qualifiedAt`, `PlatformAdmin.lastLoginAt`, новые `EventType`.
- **`.docs/modules/leads.md`** — карточка/список лидов получают бейдж и действие квалификации (любая роль компании и маркетолог).
- **`.docs/modules/pipeline.md`** — доска в режиме маркетолога read-only.
- **`.docs/modules/integrations.md`** (Phase 18) и **`.docs/modules/reports.md`** (Phase 21) — при реализации этих страниц маркетолог получает к ним доступ через allow-list (уже заложено в `constants/marketerAccess.ts`).
- **Phase 22.5** — экспорт квалификаций в Яндекс Метрику (API офлайн-конверсий), research + реализация.
