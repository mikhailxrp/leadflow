# Модуль: Интеграции (integrations)

> Спецификация подключения внешних источников: Tilda, WordPress, Яндекс Директ, универсальный webhook. Только ADMIN.
> Связанные файлы: `.docs/database.md` (`ApiKey`, `IntegrationSource`, `Company.settings`), `.docs/modules/leads-intake.md`, `.docs/modules/notifications.md` (мониторинг источников).

---

## Содержание

1. Цели модуля
2. `companyId` в URL вебхуков
3. Tilda, WordPress
4. Яндекс Директ
5. Универсальный Webhook — API-ключи
6. Статус здоровья источников
7. API-эндпоинты
8. Файлы, которые создаются
9. Серверные правила безопасности
10. Связи с другими модулями

---

## Цели модуля

После завершения этого модуля:

- Видны URL вебхуков для каждого источника, с кнопкой «Скопировать»
- Tilda и WordPress отправляют лиды по этим URL
- Яндекс Директ подключается через OAuth
- Для любого другого сайта — API-ключ
- Видно состояние здоровья каждого источника (активен / последняя ошибка / молчит)

**Не входит в модуль:**

- WhatsApp как источник — рассматривался в одной из версий, **решили полностью отказаться**; карточки/интеграции под него не существует

---

## `companyId` в URL вебхуков

Компаний много с первого дня — их создаёт платформенный администратор (`.docs/modules/platform-admin.md`).

```
APP_URL + "/api/webhooks/tilda/" + companyId
APP_URL + "/api/webhooks/wordpress/" + companyId
```

`GET /api/settings/webhook-urls` — берёт `companyId` из сессии текущего пользователя.

---

## Tilda, WordPress

3 шага подключения: скопировать URL → вставить в настройки вебхука сайта → отправить тестовую заявку. Тестовый запрос Tilda (`test=test`) обрабатывается без создания лида. Статус «Подключено» — по наличию хотя бы одного лида с этим источником.

---

## Яндекс Директ

Два режима (UTM/Полный), OAuth-флоу, хранение и обновление токенов в `Company.settings.yandexMode` — без изменений относительно предыдущих версий.

---

## Универсальный Webhook — API-ключи

Генерация (криптостойкая), хэширование, показ один раз. Каждый созданный ключ автоматически получает соответствующую запись в `IntegrationSource` (или она создаётся лениво при первом успешном приёме — см. `.docs/modules/leads-intake.md` → `touchIntegrationSource`).

---

## Статус здоровья источников

### Отображение (FR-163)

На той же странице `/admin/integrations`, под каждой карточкой источника — индикатор:

```
🟢 Активен — последняя заявка 12 минут назад
🟡 Молчит 2 часа (порог: 3 часа) — пока не алерт, но видно заранее
🔴 Не передаёт заявки 5 часов — отправлен алерт Руководителю и Администратору
⚪ Не настроено — нет ни одной заявки с этого источника
```

Источник данных — `IntegrationSource.lastUsedAt`/`lastErrorAt`/`errorCount`. Логика алерта (когда именно красный статус превращается в Telegram-сообщение) — `.docs/modules/notifications.md` → «Мониторинг источников», этот модуль только отображает.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/settings/webhook-urls` | URL вебхуков | Session | ADMIN only |
| GET/POST/DELETE | `/api/api-keys` | Управление ключами универсального webhook | Session | ADMIN only |
| GET | `/api/admin/integrations/health` | Статус здоровья всех источников компании | Session | ADMIN only |
| GET/DELETE | `/api/integrations/yandex` | OAuth Яндекса | Session | ADMIN only |

---

## Файлы, которые создаются

```
app/
├── (admin)/admin/integrations/page.tsx
└── api/
    ├── settings/webhook-urls/route.ts
    ├── api-keys/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── admin/integrations/health/route.ts
    └── integrations/yandex/route.ts

components/admin/integrations/
├── TildaCard.tsx
├── WordpressCard.tsx
├── YandexCard.tsx
├── ApiKeysList.tsx
├── CreateApiKeyModal.tsx
└── SourceHealthIndicator.tsx   # 🟢🟡🔴⚪
```

---

## Серверные правила безопасности

1. **Управление интеграциями — только `ADMIN`.** Ни Руководитель, ни Менеджер не создают/удаляют источники.
2. **API-ключ хэшируется**, plain-значение показывается клиенту один раз и не логируется.
3. **`companyId` в URL вебхуков — только для приёма**, не для аутентификации UI-запросов (UI всегда берёт `companyId` из сессии).
4. **Здоровье источников — read-only**, не редактируется напрямую — это производные данные от `touchIntegrationSource`, не настройка.

---

## Связи с другими модулями

- **`.docs/modules/leads-intake.md`** — реальный приём по этим вебхукам; `touchIntegrationSource`.
- **`.docs/modules/notifications.md`** — алерт о замолчавшем источнике, использует те же данные `IntegrationSource`.
- **`.docs/modules/app-settings.md`** — `sourceHealthThresholdHours`, `yandexMode`.
- **`.docs/database.md`** — `ApiKey`, `IntegrationSource`.
