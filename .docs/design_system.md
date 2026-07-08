# Design System — Лид-Канал

> Единый источник правды для дизайна и верстки.  
> Используется в: Visily (генерация макетов), агент (верстка компонентов), разработка (CSS-переменные).

---

## 1. Общий стиль

|Параметр|Значение|
|---|---|
|Характер|Дружелюбный, лёгкий, профессиональный|
|Референсы|Linear, Notion, Vercel Dashboard|
|Темы|Светлая + Тёмная (переключение пользователем)|
|Сайдбар|Всегда тёмный — независимо от темы|
|Язык дизайна|Flat UI. Без градиентов, теней, blur-эффектов|
|Углы|8px (компоненты), 12px (карточки), 20px (пилюли/бейджи)|
|Границы|0.5px solid — тонкие, ненавязчивые|

---

## 2. Цветовая палитра

### 2.1 Акцентные цвета (Primary — Emerald)

|Токен|HEX|Использование|
|---|---|---|
|`--color-primary`|`#10B981`|Кнопки, активные состояния, акценты|
|`--color-primary-mid`|`#34D399`|Hover-состояния, иконки|
|`--color-primary-light`|`#D1FAE5`|Фон бейджей, подсветка строк|
|`--color-primary-dark`|`#065F46`|Текст на светлом фоне primary|

### 2.2 Сайдбар (всегда тёмный)

|Токен|HEX|Использование|
|---|---|---|
|`--color-sidebar-bg`|`#1A1F2E`|Фон сайдбара (тёмная тема переопределяет напрямую)|
|`--color-sidebar-text`|`#94A3B8`|Текст навигации (inactive)|
|`--color-sidebar-text-active`|`#34D399`|Текст навигации (active)|
|`--color-sidebar-item-active`|`rgba(16,185,129,0.15)`|Фон активного пункта меню|

### 2.3 Семантические цвета

|Токен|HEX|Использование|
|---|---|---|
|`--color-info`|`#3B82F6`|Информация, источник WordPress|
|`--color-warning`|`#F59E0B`|Предупреждения, Яндекс Директ|
|`--color-danger`|`#EF4444`|Ошибки, удаление|
|`--color-purple`|`#8B5CF6`|API/Webhook источник, этап воронки|
|`--color-success`|`#22C55E`|Успех, этап «Сделка»|

### 2.4 Нейтральные (светлая тема)

|Токен|HEX|Использование|
|---|---|---|
|`--color-bg-page`|`#F8FAFC`|Фон страницы|
|`--color-bg-surface`|`#FFFFFF`|Фон карточек, таблиц|
|`--color-bg-surface-2`|`#F1F5F9`|Фон второстепенных блоков|
|`--color-text-primary`|`#0F172A`|Основной текст|
|`--color-text-secondary`|`#64748B`|Вторичный текст, метки|
|`--color-text-tertiary`|`#94A3B8`|Плейсхолдеры, подсказки|
|`--color-border`|`rgba(15,23,42,0.10)`|Границы элементов|

### 2.5 Нейтральные (тёмная тема)

|Токен|HEX|Использование|
|---|---|---|
|`--color-bg-page`|`#0F1117`|Фон страницы|
|`--color-bg-surface`|`#1E2433`|Фон карточек, таблиц|
|`--color-bg-surface-2`|`#252B3B`|Фон второстепенных блоков|
|`--color-text-primary`|`#E2E8F0`|Основной текст|
|`--color-text-secondary`|`#94A3B8`|Вторичный текст, метки|
|`--color-text-tertiary`|`#475569`|Плейсхолдеры, подсказки|
|`--color-border`|`rgba(255,255,255,0.08)`|Границы элементов|

---

## 3. Типографика

Шрифт: **Inter** (основной), `ui-monospace` (код, API-ключи, хекс-значения; JetBrains Mono не подключён)

|Роль|Размер|Вес|Использование|
|---|---|---|---|
|H1|28px|500|Заголовок страницы|
|H2|20px|500|Заголовок раздела|
|H3|15px|500|Подзаголовок блока, название карточки|
|Body|14px|400|Основной текст интерфейса|
|Small|12px|400|Метки, подсказки, вторичная информация|
|Mono|12px|400|UTM-метки, API-ключи, технические данные|

**Правила:**

- Line-height: `1.6` для body, `1.3` для заголовков
- Letter-spacing: `-0.01em` для H1/H2, `0` для body
- Цвет заголовков: `--color-text-primary`
- Цвет body: `--color-text-primary`
- Цвет меток/вторичного: `--color-text-secondary`

---

## 4. Сетка и отступы

|Токен|Значение|Использование|
|---|---|---|
|`--spacing-1`|`4px`|Минимальный gap внутри компонентов|
|`--spacing-2`|`8px`|Gap между элементами|
|`--spacing-3`|`12px`|Внутренние отступы компонентов|
|`--spacing-4`|`16px`|Padding карточек, секций|
|`--spacing-6`|`24px`|Отступы между секциями|
|`--spacing-8`|`32px`|Крупные блоки|

**Радиусы скруглений:**

|Токен|Значение|Применение|
|---|---|---|
|`--radius-sm`|`6px`|Кнопки, инпуты, мелкие элементы|
|`--radius-md`|`8px`|Компоненты, метрики|
|`--radius-lg`|`12px`|Карточки, модальные окна|
|`--radius-pill`|`20px`|Бейджи, пилюли, теги|

---

## 5. Компоненты

### 5.1 Сайдбар

```
Ширина: 220px (десктоп) / 0px скрытый (мобильный)
Фон: #1A1F2E (светлая) / #0F1117 (тёмная)
Всегда тёмный — НЕ меняется при смене темы

Структура:
┌─────────────────────┐
│ ● Лид-Канал         │  ← Логотип: dot #10B981 + название белый
│                     │
│ ⊞ Дашборд     ←active│  ← Активный: bg rgba(16,185,129,0.15), текст #34D399
│ 👥 Лиды             │  ← Неактивный: текст #94A3B8
│ ⊟ Воронка           │
│ 🔌 Интеграции       │
│ ⚙ Настройки        │
│                     │
│ [АД] Администратор  │  ← Аватар-инициалы внизу
└─────────────────────┘

Пункт меню:
- padding: 7px 8px
- border-radius: 6px
- gap между иконкой и текстом: 8px
- font-size: 13px
- Hover: bg rgba(255,255,255,0.06)
```

### 5.2 Метрика-карточка (Dashboard)

```
background: --color-bg-surface
border: 0.5px solid --color-border
border-radius: --radius-md
padding: 10px 12px

Структура:
┌──────────────┐
│ Всего лидов  │  ← label: 11px, --color-text-secondary
│ 248          │  ← value: 20px, font-weight 500
└──────────────┘

Акцентное значение (новые, сделки): color: #10B981
Сетка: 4 колонки, gap: 8px
```

### 5.3 Бейджи статусов воронки

|Этап|Фон (светлая)|Текст|Dot|
|---|---|---|---|
|Новый лид|`#EFF6FF`|`#1D4ED8`|`#3B82F6`|
|Первичный контакт|`#F5F3FF`|`#6D28D9`|`#8B5CF6`|
|В работе|`#FFFBEB`|`#B45309`|`#F59E0B`|
|Тёплый клиент|`#ECFDF5`|`#065F46`|`#10B981`|
|Сделка|`#F0FDF4`|`#166534`|`#22C55E`|

```
Структура бейджа:
● Название этапа

padding: 4px 10px
border-radius: 20px (pill)
font-size: 12px, font-weight: 500
dot: width/height 6px, border-radius 50%
gap между dot и текстом: 5px
```

### 5.4 Бейджи источников лидов

|Источник|Иконка|Цвет иконки|
|---|---|---|
|Tilda|layout|`#10B981`|
|WordPress|brand-wordpress|`#3B82F6`|
|Яндекс Директ|ad|`#F59E0B`|
|API / Webhook|api|`#8B5CF6`|
|Другой|dots|`#94A3B8`|

```
Структура:
[icon] Название

background: --color-bg-surface-2
border: 0.5px solid --color-border
border-radius: --radius-md
padding: 5px 12px
font-size: 12px, font-weight: 500
gap: 6px
```

### 5.5 Таблица лидов

```
Header строка:
- font-size: 11px
- font-weight: 500
- color: --color-text-secondary
- border-bottom: 0.5px solid --color-border
- padding: 8px

Data строка:
- font-size: 13px
- color: --color-text-primary
- border-bottom: 0.5px solid --color-border
- padding: 10px 8px
- hover: background --color-bg-surface-2
- cursor: pointer (строка кликабельна)

Колонки: Имя | Телефон | Email | Источник | Менеджер | Статус | Дата
```

### 5.6 Кнопки

|Тип|Фон|Текст|Border|
|---|---|---|---|
|Primary|`#10B981`|`#FFFFFF`|нет|
|Secondary|`--color-bg-surface-2`|`--color-text-primary`|`0.5px --color-border`|
|Danger|`#FEF2F2`|`#DC2626`|`0.5px #FECACA`|
|Ghost|transparent|`--color-text-secondary`|нет|

```
Размеры:
- sm: height 28px, padding 0 10px, font-size 12px
- md: height 36px, padding 0 14px, font-size 13px (default)
- lg: height 42px, padding 0 18px, font-size 14px

border-radius: --radius-sm (6px)
font-weight: 500
transition: all 0.15s
```

### 5.7 Инпуты и формы

```
height: 36px
padding: 0 12px
border: 0.5px solid --color-border
border-radius: --radius-sm
background: --color-bg-surface
color: --color-text-primary
font-size: 14px

Focus: border-color #10B981, outline none
Placeholder: --color-text-tertiary
```

### 5.8 Карточка лида (Kanban)

```
┌─────────────────────┐
│ Иван Петров         │  ← 13px, font-weight 500
│ +7 999 000-00-00    │  ← 12px, --color-text-secondary
│ [Tilda]  [Тёплый●]  │  ← source badge + status badge
│ Менеджер: А.Д.      │  ← 11px, --color-text-tertiary
└─────────────────────┘

background: --color-bg-surface
border: 0.5px solid --color-border
border-radius: --radius-md
padding: 10px 12px
margin-bottom: 6px
cursor: grab
hover: border-color #10B981
```

### 5.9 Toast-уведомление

```
┌─────────────────────────────┐
│ 🔔 Новый лид                │
│ Иван Петров · Tilda         │
│                  [Открыть →]│
└─────────────────────────────┘

Позиция: fixed, top-right, margin 16px
background: --color-bg-surface
border: 0.5px solid #10B981 (левая полоска 3px)
border-radius: --radius-md
padding: 12px 16px
width: 300px
font-size: 13px
box-shadow: нет (flat UI)
auto-dismiss: 5 секунд
```

---

## 6. Иконки

Библиотека: **Lucide** через `@iconify/react`

|Раздел|Иконка|
|---|---|
|Дашборд|`ti-layout-dashboard`|
|Лиды|`ti-users`|
|Воронка / Kanban|`ti-layout-kanban`|
|Интеграции|`ti-plug`|
|Настройки|`ti-settings`|
|Пользователи|`ti-user`|
|Уведомление|`ti-bell`|
|Поиск|`ti-search`|
|Фильтр|`ti-filter`|
|Добавить|`ti-plus`|
|Удалить|`ti-trash`|
|Редактировать|`ti-edit`|
|Копировать|`ti-copy`|
|API ключ|`ti-key`|
|Статус активен|`ti-circle-check`|
|Статус заблокирован|`ti-ban`|
|Перетащить|`ti-grip-vertical`|
|История|`ti-history`|
|Комментарий|`ti-message`|
|Источник / UTM|`ti-chart-arrows`|

Размер иконок в навигации: `16px`  
Размер иконок в кнопках: `16px`  
Размер декоративных иконок: `20px`

---

## 7. Структура страниц

### Общий layout

```
┌──────────────┬────────────────────────────────────────┐
│              │  Header: заголовок + действия           │
│   Sidebar    ├────────────────────────────────────────┤
│   220px      │                                        │
│   (dark)     │   Content area                         │
│              │   padding: 24px                        │
│              │   background: --color-bg-page          │
└──────────────┴────────────────────────────────────────┘
```

### Header страницы

```
height: 56px
padding: 0 24px
border-bottom: 0.5px solid --color-border
background: --color-bg-surface
display: flex, align-items: center, justify-content: space-between

Левая часть: H1 заголовок (20px, weight 500)
Правая часть: кнопки действий + колокольчик уведомлений
```

---

## 8. Адаптивность

|Брейкпоинт|Поведение|
|---|---|
|`≥ 1024px` (lg)|Полный layout, sidebar 220px виден|
|`< 1024px`|Sidebar скрыт, бургер-кнопка в хедере открывает overlay|
|Таблицы на мобильном|`overflow-x: auto`, горизонтальный скролл|
|Kanban на мобильном|Вертикальный стек колонок|
|Метрики на мобильном|2 колонки вместо 4|

---

## 9. CSS-переменные (готово к копированию)

```css
:root {
  /* Primary — Emerald */
  --color-primary: #10B981;
  --color-primary-mid: #34D399;
  --color-primary-light: #D1FAE5;
  --color-primary-dark: #065F46;

  /* Semantic */
  --color-info: #3B82F6;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-success: #22C55E;
  --color-purple: #8B5CF6;

  /* Sidebar (constant) */
  --color-sidebar-bg: #1A1F2E;
  --color-sidebar-text: #94A3B8;
  --color-sidebar-text-active: #34D399;
  --color-sidebar-item-active: rgba(16, 185, 129, 0.15);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 20px;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;
}

/* Light theme */
[data-theme="light"] {
  --color-bg-page: #F8FAFC;
  --color-bg-surface: #FFFFFF;
  --color-bg-surface-2: #F1F5F9;
  --color-text-primary: #0F172A;
  --color-text-secondary: #64748B;
  --color-text-tertiary: #94A3B8;
  --color-border: rgba(15, 23, 42, 0.10);
}

/* Dark theme */
[data-theme="dark"] {
  --color-bg-page: #0F1117;
  --color-bg-surface: #1E2433;
  --color-bg-surface-2: #252B3B;
  --color-text-primary: #E2E8F0;
  --color-text-secondary: #94A3B8;
  --color-text-tertiary: #475569;
  --color-border: rgba(255, 255, 255, 0.08);

  /* Sidebar в тёмной теме */
  --color-sidebar-bg: #0F1117;
}
```

---

## 10. Правила для Visily

При генерации макетов строго соблюдать:

1. **Сайдбар всегда тёмный** `#1A1F2E` — даже в светлой теме
2. **Акцентный цвет** — только `#10B981` (изумрудный), не синий
3. **Flat UI** — никаких градиентов, теней, blur
4. **Бейджи статусов** — строго по таблице из раздела 5.3
5. **Границы** — `0.5px` везде, не `1px`
6. **Типографика** — Inter, только веса 400 и 500
7. **Фон страницы** — `#F8FAFC` (светлая), `#0F1117` (тёмная)
8. **Карточки** — белый фон `#FFFFFF`, граница `0.5px`, радиус `12px`
9. **Иконки** — только Tabler outline
10. **Кнопка primary** — `#10B981` фон, белый текст, радиус `6px`