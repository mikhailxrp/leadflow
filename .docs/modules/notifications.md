# Модуль: Уведомления (notifications)

> Спецификация уведомлений о новых лидах: реальное время в интерфейсе (SSE), Telegram ответственному менеджеру, счётчик непрочитанных.
> Связанные файлы: `.docs/database.md` (модели `Lead`, `User.telegramChatId`, `Company.settings`), `.docs/modules/leads-intake.md` (триггер после приёма), `.docs/modules/assignment.md` (кому слать).

---

## Содержание

1. [Цели модуля](#цели-модуля)
2. [Два канала уведомлений](#два-канала-уведомлений)
3. [Архитектурные решения](#архитектурные-решения)
4. [SSE — уведомления в интерфейсе](#sse--уведомления-в-интерфейсе)
5. [Telegram-уведомления](#telegram-уведомления)
6. [Привязка Telegram-аккаунта](#привязка-telegram-аккаунта)
7. [Счётчик непрочитанных](#счётчик-непрочитанных)
8. [Точка запуска: notifyNewLead](#точка-запуска-notifynewlead)
9. [API-эндпоинты](#api-эндпоинты)
10. [Файлы, которые создаются](#файлы-которые-создаются)
11. [Серверные правила безопасности](#серверные-правила-безопасности)
12. [Связи с другими модулями](#связи-с-другими-модулями)

---

## Цели модуля

После завершения этого модуля:

- Новый лид появляется в интерфейсе в реальном времени без перезагрузки (SSE)
- Toast-уведомление о новом лиде с кнопкой «Открыть»
- Ответственный менеджер получает уведомление в Telegram
- Менеджер может привязать свой Telegram-аккаунт
- Колокольчик в хедере со счётчиком непрочитанных
- Сбой уведомлений не ломает приём лида

**Не входит в модуль:**

- Приём лида → `.docs/modules/leads-intake.md` (вызывает `notifyNewLead` после коммита)
- Определение ответственного → `.docs/modules/assignment.md`
- Email-уведомления — out of scope MVP
- Push-уведомления браузера — out of scope MVP (только in-app toast)

---

## Два канала уведомлений

```
Новый лид принят и сохранён
        │
        ├─→ SSE      → всем открытым вкладкам CRM компании (toast + обновление списка/доски)
        │
        └─→ Telegram → ответственному менеджеру (если назначен и привязал Telegram)
```

| Канал | Кому | Когда |
| --- | --- | --- |
| SSE (in-app) | Всем авторизованным пользователям компании с открытой вкладкой | Мгновенно при приёме |
| Telegram | Ответственному менеджеру лида | При приёме, если менеджер назначен и `telegramChatId` задан |

Оба канала включены в MVP (FR-60…FR-64). Telegram опционален per-менеджер: не привязал — получает только in-app.

---

## Архитектурные решения

### 1. SSE, а не WebSocket

Уведомления — односторонние (сервер → клиент). SSE проще WebSocket: работает поверх обычного HTTP, авто-reconnect из коробки (`EventSource`), не нужен отдельный сервер сокетов. Для «новый лид прилетел» этого достаточно (см. `CLAUDE.md` → стек).

### 2. Единая точка запуска `notifyNewLead`

Вся рассылка — в `lib/notifications/notifyNewLead.ts`. Вызывается из приёма лида **после коммита транзакции**. Внутри — оба канала. Связь с приёмом — односторонняя: приём вызывает уведомления, но не ждёт и не падает из-за них.

### 3. Уведомления не блокируют и не валят приём

```
try {
  await notifyNewLead(leadId);
} catch (e) {
  logError("notify failed", e);   // логируем, но приём уже успешен
}
```

Сбой Telegram (недоступен API, неверный токен) или отсутствие открытых вкладок — не ошибка приёма. Лид сохранён, ответ webhook'у уже `200`.

### 4. In-memory реестр SSE-подключений

Активные SSE-соединения держатся в памяти процесса (`lib/sse.ts`), сгруппированы по `companyId`. При приёме лида — рассылка по подключениям нужной компании. Для MVP (одна инсталляция, один процесс PM2) этого достаточно. При горизонтальном масштабировании — заменить на Redis pub/sub.

---

## SSE — уведомления в интерфейсе

### Поток (FR-60)

Клиент открывает постоянное соединение `GET /api/stream`. Сервер держит его и шлёт события по мере появления.

```
Клиент (любая страница CRM):
  const es = new EventSource("/api/stream");
  es.addEventListener("new_lead", (e) => {
    const lead = JSON.parse(e.data);
    showToast(lead);              // toast «Новый лид»
    refreshIfRelevant(lead);      // обновить список/доску, если открыты
    incrementUnread();            // +1 к колокольчику
  });
```

### Серверная сторона

```
GET /api/stream:
  1. Проверить сессию → companyId
  2. Зарегистрировать подключение в реестре (lib/sse.ts) под companyId
  3. Держать поток открытым, слать heartbeat каждые ~30 сек (против таймаутов прокси)
  4. На закрытие соединения — удалить из реестра
```

### Toast (FR-61)

Компонент `components/notifications/Toast.tsx`. Появляется справа сверху: «Новый лид — {имя} · {источник}» + кнопка «Открыть» (ведёт на карточку). Авто-скрытие через ~5 сек (см. `design-system.md` → toast).

### Видимость в SSE

SSE шлёт событие всем пользователям компании, но клиент учитывает видимость: если менеджер в режиме `OWN` и лид назначен не ему — toast можно не показывать (или показывать обезличенно). Решение уточняет реализация; сервер не рассылает приватные данные лида сверх необходимого (только имя, источник, id).

---

## Telegram-уведомления

### Поведение (FR-62)

При приёме лида, если у лида есть ответственный менеджер с заданным `telegramChatId` — ему уходит сообщение в Telegram.

```
Если → лид назначен менеджеру И у менеджера telegramChatId задан И settings.telegramEnabled
То   → отправить Telegram-сообщение этому менеджеру
Иначе→ пропустить Telegram-канал (остаётся только in-app)
```

### Реализация

`lib/telegram.ts` — отправка через Telegram Bot API. Токен бота — в `.env` (`TELEGRAM_BOT_TOKEN`). Отправка простым `fetch` на `https://api.telegram.org/bot<token>/sendMessage`.

```typescript
// lib/telegram.ts — концепт
async function sendTelegram(chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  // ошибки логируются, не пробрасываются (не должны валить приём)
}
```

### Текст сообщения

```
🔔 Новый лид
Имя: Иван Петров
Телефон: +7 999 000-00-00
Источник: Tilda
```

Шаблон — в `constants/telegramTemplates.ts`. Без чувствительных данных сверх контактов.

### Лимиты Telegram

Telegram Bot API имеет лимиты (~30 сообщений/сек суммарно). Для MVP с одним клиентом это не проблема. Если поток лидов вырастет — очередь отправки (задел, не в MVP). Отмечено в PRD → риски.

---

## Привязка Telegram-аккаунта

### Зачем

Чтобы бот знал, куда слать — нужен `chat_id` менеджера (FR-63). Пользователь не знает свой `chat_id`, поэтому привязка через бота.

### Флоу привязки

```
1. Менеджер в профиле жмёт «Привязать Telegram»
2. CRM показывает ссылку на бота с уникальным токеном привязки:
   https://t.me/<bot>?start=<bindToken>
3. Менеджер открывает, жмёт Start в Telegram
4. Бот получает /start <bindToken> (через webhook бота или polling)
5. Сервер находит пользователя по bindToken, сохраняет chat_id в User.telegramChatId
6. CRM показывает «Telegram привязан»
```

`bindToken` — одноразовый, с TTL. Хранится временно (in-memory или поле в User с истечением). Детали — реализация фазы.

### Отвязка

Менеджер может отвязать → `telegramChatId = null`. Уведомления в Telegram прекращаются, in-app остаётся.

---

## Счётчик непрочитанных

### Поведение (FR-64)

Колокольчик в хедере (`components/notifications/NotificationBell.tsx`) с бейджем количества непрочитанных.

Для MVP — **лёгкая модель**: счётчик живёт на клиенте в рамках сессии (Zustand `notificationStore`), инкрементится на каждое SSE-событие `new_lead`, сбрасывается при открытии дропдауна уведомлений.

```
SSE new_lead → notificationStore.increment()
Открыл дропдаун → notificationStore.markRead()
```

Дропдаун показывает последние N уведомлений сессии: текст, время, статус. Персистентная история уведомлений (хранение в БД, непрочитанные между сессиями) — out of scope MVP, при необходимости отдельная таблица позже.

---

## Точка запуска: notifyNewLead

Единая функция, вызываемая из приёма лида после коммита.

```typescript
// lib/notifications/notifyNewLead.ts — концепт
async function notifyNewLead(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { assignedTo: true, company: true },
  });

  // 1. SSE — всем подключениям компании
  sseRegistry.broadcast(lead.companyId, "new_lead", {
    id: lead.id, name: lead.name, source: lead.source, assignedToId: lead.assignedToId,
  });

  // 2. Telegram — ответственному, если есть и включено
  const settings = lead.company.settings as CompanySettings;
  if (settings.telegramEnabled && lead.assignedTo?.telegramChatId) {
    await sendTelegram(lead.assignedTo.telegramChatId, buildLeadMessage(lead));
  }
}
```

**Порядок вызова в приёме** (`.docs/modules/leads-intake.md`):

```
транзакция приёма (commit)
  → autoAssignLead(leadId)   // assignment: назначить (если round-robin)
  → notifyNewLead(leadId)    // notifications: SSE + Telegram (уже зная ответственного)
```

Назначение идёт ДО уведомления — чтобы Telegram ушёл уже назначенному менеджеру.

---

## API-эндпоинты

| Метод | Путь | Назначение | Auth | Право |
| --- | --- | --- | --- | --- |
| GET | `/api/stream` | SSE-поток событий компании | Session | ADMIN / MANAGER |
| POST | `/api/telegram/bind` | Сгенерировать токен привязки | Session | ADMIN / MANAGER |
| POST | `/api/telegram/webhook` | Webhook бота (приём /start с токеном) | Bot secret | — |
| DELETE | `/api/telegram/bind` | Отвязать Telegram | Session | ADMIN / MANAGER |

### `GET /api/stream`

SSE-соединение. Сервер шлёт события вида:

```
event: new_lead
data: { "id": "clxxx", "name": "Иван", "source": "TILDA", "assignedToId": "cluuu" }

: heartbeat        (комментарий-пинг каждые ~30 сек)
```

### `POST /api/telegram/bind`

**Response 200:**

```json
{ "url": "https://t.me/leadcrm_bot?start=bind_xxx", "expiresIn": 600 }
```

### `POST /api/telegram/webhook`

Принимает апдейты от Telegram (`/start <bindToken>`). Защищён секретным путём/токеном (Telegram шлёт на заранее заданный URL). Находит пользователя по токену, сохраняет `chat_id`.

---

## Файлы, которые создаются

```
app/
└── api/
    ├── stream/route.ts                 # GET: SSE-поток (держит соединение)
    └── telegram/
        ├── bind/route.ts               # POST (токен привязки), DELETE (отвязать)
        └── webhook/route.ts            # POST: апдейты бота (/start <token>)

lib/
├── sse.ts                              # Реестр SSE-подключений + broadcast(companyId, event, data)
├── telegram.ts                         # sendTelegram(chatId, text) + обработка /start
└── notifications/
    └── notifyNewLead.ts                # Единая точка: SSE + Telegram

constants/
└── telegramTemplates.ts                # Шаблоны сообщений бота

store/
└── notificationStore.ts               # Zustand: счётчик непрочитанных, лента сессии

components/
└── notifications/
    ├── Toast.tsx                       # Client: toast о новом лиде
    ├── NotificationBell.tsx            # Client: колокольчик + счётчик
    ├── NotificationDropdown.tsx        # Client: лента последних уведомлений
    ├── SseProvider.tsx                 # Client: подписка на /api/stream, раздача событий
    └── TelegramBindButton.tsx          # Client: привязка/отвязка Telegram в профиле
```

> `notifyNewLead` вызывается из `lib/intake/createLead.ts` (leads-intake) после коммита и назначения.

---

## Серверные правила безопасности

1. **SSE отдаёт только данные своей компании.** Реестр группирует подключения по `companyId` из сессии. Пользователь не получит события чужого тенанта.

2. **SSE не шлёт лишних данных.** В событии — минимум (id, имя, источник, assignedToId). Полные данные лида клиент догружает через `GET /api/leads/:id` (там работает `visibilityWhere`).

3. **Уведомления не валят приём.** `notifyNewLead` обёрнут в try/catch на стороне вызова; ошибка логируется, приём остаётся успешным.

4. **`TELEGRAM_BOT_TOKEN` — только в `.env`, на сервере.** Никогда на клиент. Запросы к Telegram API — только с сервера.

5. **`bindToken` одноразовый и с TTL.** После использования — недействителен. Защита от привязки чужого аккаунта по перехваченной ссылке.

6. **Webhook бота защищён.** Telegram шлёт на секретный URL; проверяется секретный токен заголовка (`X-Telegram-Bot-Api-Secret-Token`). Чужой POST на webhook отклоняется.

7. **`chat_id` привязывается только к пользователю своей компании.** Через сессию/токен, не из тела запроса напрямую.

8. **Heartbeat в SSE** — против обрыва соединения прокси по таймауту. Без него Nginx может рвать «молчащее» соединение.

---

## Связи с другими модулями

- **`.docs/modules/leads-intake.md`** — вызывает `notifyNewLead(leadId)` после коммита и назначения.
- **`.docs/modules/assignment.md`** — назначение идёт до уведомления, чтобы Telegram ушёл уже назначенному менеджеру. Переназначение тоже может триггерить уведомление новому ответственному.
- **`.docs/modules/app-settings.md`** — флаг `telegramEnabled` в настройках компании.
- **`.docs/modules/leads.md`** — toast ведёт на карточку лида; SSE обновляет открытый список/доску.
- **`.docs/database.md`** — `User.telegramChatId`, `Company.settings.telegramEnabled`.
