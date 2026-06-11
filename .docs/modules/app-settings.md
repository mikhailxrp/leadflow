# Модуль: Настройки системы (app-settings)

> Спецификация глобальных настроек компании: режим распределения лидов, видимость лидов менеджерами, переключатель Telegram, режим Яндекса. Только для роли ADMIN.
> Связанные файлы: `.docs/database.md` (модель `Company.settings`), `.docs/modules/assignment.md`, `.docs/modules/leads.md`, `.docs/modules/notifications.md`, `.docs/modules/integrations.md`.

---

## Содержание

1. [Цели модуля](#цели-модуля)
2. [Архитектурные решения](#архитектурные-решения)
3. [Структура настроек](#структура-настроек)
4. [Режим распределения лидов](#режим-распределения-лидов)
5. [Видимость лидов](#видимость-лидов)
6. [Переключатель Telegram](#переключатель-telegram)
7. [Режим Яндекс Директа](#режим-яндекс-директа)
8. [API-эндпоинты](#api-эндпоинты)
9. [Файлы, которые создаются](#файлы-которые-создаются)
10. [Серверные правила безопасности](#серверные-правила-безопасности)
11. [Связи с другими модулями](#связи-с-другими-модулями)

---

## Цели модуля

После завершения этого модуля:

- Админ переключает режим распределения (ручной / round-robin)
- Админ переключает видимость лидов менеджерами (все / только свои)
- Админ включает/выключает Telegram-уведомления
- Админ переключает режим Яндекс Директа (полный / UTM-only)
- Все настройки хранятся в одном месте (`Company.settings`)
- Изменение настройки сразу влияет на поведение системы

**Не входит в модуль:**

- Логика самого распределения → `.docs/modules/assignment.md`
- Применение видимости в запросах → `.docs/modules/leads.md`
- Отправка уведомлений → `.docs/modules/notifications.md`
- Управление API-ключами и OAuth Яндекса → `.docs/modules/integrations.md`

Этот модуль — **только хранение и переключение флагов**. Их применение живёт в соответствующих модулях.

---

## Архитектурные решения

### 1. Все настройки — в `Company.settings` (JSONB)

Один источник, читается целиком по `companyId`. JSONB позволяет добавлять флаги без миграции (см. `.docs/database.md` → модель Company). Это не данные для поиска — настройки берутся всегда вместе.

### 2. Единый эндпоинт `PATCH /api/settings`

Все переключатели идут через один эндпоинт с частичным апдейтом. Не плодим по эндпоинту на флаг. Сервер мёржит присланные поля с текущими `settings`.

### 3. Дефолты задаёт сидер

При создании компании сидер пишет безопасные дефолты (`.docs/database.md` → «Сидеры»):

```json
{ "assignMode": "MANUAL", "leadVisibility": "ALL",
  "roundRobinCursor": null, "telegramEnabled": false }
```

---

## Структура настроек

```typescript
// тип Company.settings
type CompanySettings = {
  assignMode: "MANUAL" | "ROUND_ROBIN";   // режим распределения (FR-32)
  leadVisibility: "ALL" | "OWN";          // видимость лидов менеджерами
  roundRobinCursor: string | null;        // служебное: курсор round-robin (НЕ редактируется вручную)
  telegramEnabled: boolean;               // вкл/выкл Telegram-уведомления
  yandexMode?: "UTM" | "FULL";            // режим Яндекса (опц., дефолт UTM)
};
```

**`roundRobinCursor`** — служебное поле, меняется только логикой автораспределения (`assignment`), не через UI настроек. В форму настроек не выводится.

---

## Режим распределения лидов

### Переключатель (FR-32)

```
MANUAL (по умолчанию)
  → новый лид приходит без ответственного
  → админ назначает вручную в карточке

ROUND_ROBIN
  → новый лид автоматически уходит следующему активному менеджеру по кругу
```

UI — переключатель/радио в настройках. Изменение → `PATCH /api/settings { assignMode }`.

Применение — в `.docs/modules/assignment.md` (читает `assignMode` при приёме лида). Здесь только хранение флага.

---

## Видимость лидов

### Переключатель

```
ALL (по умолчанию)
  → менеджеры видят все лиды компании

OWN
  → менеджеры видят только лиды, назначенные на них
  → админ всегда видит все
```

UI — переключатель в настройках. Изменение → `PATCH /api/settings { leadVisibility }`.

Применение — в `.docs/modules/leads.md` (`visibilityWhere` читает `leadVisibility` в каждом запросе лидов). Здесь только хранение.

**Важно:** смена на `OWN` сразу скрывает чужие лиды от менеджеров (применяется на следующем запросе списка/карточки). Уже открытые вкладки обновятся при следующем действии.

---

## Переключатель Telegram

### Поведение

```
telegramEnabled = true
  → при приёме лида ответственному с привязанным Telegram уходит сообщение

telegramEnabled = false
  → Telegram-канал отключён глобально (остаётся только in-app SSE)
```

UI — тумблер. Изменение → `PATCH /api/settings { telegramEnabled }`.

Применение — в `.docs/modules/notifications.md` (`notifyNewLead` проверяет флаг). Здесь только хранение.

Глобальный выключатель не отменяет привязки `telegramChatId` менеджеров — просто временно глушит канал. Включил обратно — рассылка возобновляется.

---

## Режим Яндекс Директа

### Поведение

```
yandexMode = "UTM" (по умолчанию)
  → лиды Яндекса принимаются по UTM-меткам

yandexMode = "FULL"
  → полный режим через API кабинета (требует OAuth — см. integrations)
```

UI-переключатель живёт на странице интеграций (`.docs/modules/integrations.md`), но хранится в `settings` и меняется тем же `PATCH /api/settings { yandexMode }`. Этот модуль обеспечивает хранение, integrations — UI и OAuth-флоу.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/settings` | Текущие настройки компании | Session | ADMIN / MANAGER (чтение) |
| PATCH | `/api/settings` | Изменить настройки (частично) | Session | ADMIN only |

> GET доступен и менеджеру (например, клиенту нужно знать `leadVisibility` для UI), но без служебных полей. PATCH — только ADMIN.

### `GET /api/settings`

**Response 200 (для ADMIN — полные, кроме служебных):**

```json
{ "assignMode": "ROUND_ROBIN", "leadVisibility": "OWN",
  "telegramEnabled": true, "yandexMode": "UTM" }
```

`roundRobinCursor` не отдаётся (служебное).

### `PATCH /api/settings`

**Request (частичный апдейт):** `{ "assignMode": "ROUND_ROBIN" }`
**Response 200:** `{ "success": true, "settings": { ...обновлённые } }`
**Response 403 (не админ):** `{ "success": false, "error": "FORBIDDEN" }`
**Response 400:** `{ "success": false, "error": "VALIDATION_ERROR" }`

Сервер мёржит присланные поля с текущими, валидирует значения (Zod), не позволяет писать `roundRobinCursor` через этот эндпоинт.

---

## Файлы, которые создаются

```
app/
├── (admin)/
│   └── admin/
│       └── settings/
│           └── page.tsx                # Server Component: страница настроек (ADMIN)
└── api/
    └── settings/
        └── route.ts                    # GET (читать), PATCH (изменить)

lib/
└── settings/
    ├── getSettings.ts                  # Чтение settings компании (с дефолтами)
    └── updateSettings.ts               # Частичный апдейт + защита служебных полей

components/
└── admin/
    └── settings/
        ├── AssignModeToggle.tsx        # Client: ручной / round-robin
        ├── VisibilityToggle.tsx        # Client: все / только свои
        └── TelegramToggle.tsx          # Client: вкл/выкл Telegram

lib/validations/
└── settings.ts                         # Zod: updateSettingsSchema (без roundRobinCursor)
```

> `getSettings` используется многими модулями (assignment, leads, notifications) как helper чтения настроек.

---

## Серверные правила безопасности

1. **PATCH — только ADMIN.** Менеджер не меняет настройки компании. Проверка роли на сервере.

2. **Все операции — с `companyId` из сессии.** Настройки изолированы по компании.

3. **`roundRobinCursor` нельзя задать через API.** Это служебное поле логики распределения. Zod-схема `PATCH` его не принимает; попытка прислать игнорируется.

4. **Значения валидируются** (Zod): `assignMode ∈ {MANUAL, ROUND_ROBIN}`, `leadVisibility ∈ {ALL, OWN}`, `telegramEnabled: boolean`, `yandexMode ∈ {UTM, FULL}`. Произвольные значения отклоняются.

5. **Частичный апдейт мёржит, не затирает.** Прислали один флаг — меняется один, остальные сохраняются. Не перезаписываем весь объект присланным.

6. **GET не отдаёт служебные поля** (`roundRobinCursor`) и не отдаёт ничего чужой компании.

7. **Дефолты гарантированы.** `getSettings` возвращает дефолты для отсутствующих полей — на случай, если в `settings` чего-то нет (старая компания, новый флаг).

---

## Связи с другими модулями

- **`.docs/modules/assignment.md`** — читает `assignMode`; управляет `roundRobinCursor` (служебное).
- **`.docs/modules/leads.md`** — `visibilityWhere` читает `leadVisibility` в каждом запросе.
- **`.docs/modules/notifications.md`** — `notifyNewLead` проверяет `telegramEnabled`.
- **`.docs/modules/integrations.md`** — UI режима Яндекса; хранение `yandexMode` здесь.
- **`.docs/database.md`** — модель `Company.settings`, дефолты в сидере.
