# Design Direction — LeadFlow

## Проект
CRM для управления лидами и воронкой продаж.
Аудитория: менеджеры по продажам, администраторы.

## Общий стиль
Flat UI. Дружелюбный, профессиональный. Референсы: Linear, Notion, Vercel Dashboard.
Без градиентов, теней, blur-эффектов.

## Темы
- Светлая + тёмная (переключение через `data-theme="light|dark"` на `<html>`)
- **Сайдбар всегда тёмный** — `#1A1F2E` в любой теме

## Цвета

### Акцент (Emerald)
- primary:       `#10B981`
- primary-hover: `#0E9E6E`
- primary-mid:   `#34D399`
- primary-light: `#D1FAE5`
- primary-dark:  `#065F46`

### Семантика
- info:    `#3B82F6`
- warning: `#F59E0B`
- danger:  `#EF4444`
- success: `#22C55E`
- purple:  `#8B5CF6`

### Поверхности (светлая тема)
- bg-page:      `#F8FAFC`
- bg-surface:   `#FFFFFF`
- bg-surface-2: `#F1F5F9`
- text-primary: `#0F172A`
- text-secondary:`#64748B`
- text-tertiary: `#94A3B8`
- border:        `rgba(15,23,42,0.10)` → `0.5px solid`

### Поверхности (тёмная тема)
- bg-page:      `#0F1117`
- bg-surface:   `#1E2433`
- bg-surface-2: `#252B3B`
- text-primary: `#E2E8F0`
- text-tertiary:`#475569`
- border:        `rgba(255,255,255,0.08)`

## Типографика
- Основной шрифт: **Inter** (400, 500)
- Моно: **JetBrains Mono** (400) — UTM-метки, API-ключи
- H1: 28px / 500 / tracking -0.01em
- H2: 20px / 500
- H3: 15px / 500
- Body: 14px / 400 / line-height 1.6
- Small: 12px / 400
- Table header: 11px / 500

## Радиусы
- sm: 6px   → кнопки, инпуты
- md: 8px   → компоненты, метрики
- lg: 12px  → карточки, модальные
- xl: 14px  → таблицы, панели
- pill: 20px → бейджи, теги

## Границы
- Везде `0.5px solid var(--color-border)` — никогда не 1px

## Кнопки
- primary:   bg `#10B981` / text white / radius 6px
- secondary: bg surface-2 / border 0.5px / radius 6px
- danger:    bg `#FEF2F2` / text `#DC2626` / border `#FECACA`
- ghost:     transparent / text secondary
- Размеры: sm=28px, md=36px (default), lg=42px

## Layout
- Sidebar: 220px фикс слева, всегда тёмный
- Header: 56px, bg surface, border-bottom 0.5px
- Content: padding 24px, bg var(--color-bg-page)
- Breakpoints: 1280px полный / 768px sidebar 60px / <768px sidebar скрыт

## Иконки
Библиотека: **Tabler Icons** (outline) через @iconify/react
- nav: 16px
- кнопки: 16px
- декоративные: 20px

## Правила
1. Сайдбар ВСЕГДА `#1A1F2E` — в любой теме
2. Акцент ТОЛЬКО `#10B981` — не синий, не другой зелёный
3. Flat UI — никаких box-shadow, gradient, backdrop-filter
4. Бейджи статусов — строго по палитре из Badge.tsx
5. Все границы — 0.5px, не 1px
6. Только Inter weights 400 и 500
7. Layout только через flex — не grid на уровне страниц
8. Без CSS-фреймворков кроме Tailwind
