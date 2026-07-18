import 'server-only';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Раздел «Помощь» — рендерит существующее руководство пользователя из
 * `.docs/user-guide/*.md`. Единый источник правды: сами markdown-файлы, здесь мы
 * их только читаем и раскладываем по маршрутам. Скриншоты, на которые ссылается
 * руководство (`images/*.png`), скопированы в `public/user-guide/` и отдаются
 * статикой — см. `preprocessHelpMarkdown`.
 */

export interface HelpDoc {
  /** Сегмент URL: /help/<slug>. */
  slug: string;
  /** Заголовок раздела (он же <h1> страницы). */
  title: string;
  /** Короткое описание для карточек обзора и подписи в меню. */
  summary: string;
  /** Iconify-иконка (lucide). */
  icon: string;
  /** Имя файла в `.docs/user-guide/`. */
  file: string;
}

/**
 * Порядок = порядок в меню. README.md не рендерится как раздел — это служебный
 * индекс для авторов документации; вместо него /help показывает страницу-обзор
 * (`app/(company)/(app)/help/page.tsx`), собранную из этих же описаний.
 */
export const HELP_DOCS: HelpDoc[] = [
  {
    slug: 'intro',
    title: 'Введение и словарик',
    summary:
      'Что такое Лид-Канал, как заявка проходит через систему и объяснение всех важных слов. Прочитать стоит всем.',
    icon: 'lucide:book-open',
    file: '00-intro.md',
  },
  {
    slug: 'manager',
    title: 'Менеджер',
    summary:
      'Как работать с лидами: брать в работу, вести по воронке, ставить задачи и напоминания, закрывать сделки.',
    icon: 'lucide:user',
    file: '01-manager.md',
  },
  {
    slug: 'head',
    title: 'Руководитель',
    summary:
      'Всё, что умеет менеджер, плюс контроль команды, отчёты, распределение лидов и данные компании.',
    icon: 'lucide:users-round',
    file: '02-head.md',
  },
  {
    slug: 'admin',
    title: 'Администратор',
    summary:
      'Всё, что умеет руководитель, плюс настройка системы: уведомления, распределение, пользователи, интеграции, импорт.',
    icon: 'lucide:settings',
    file: '03-admin.md',
  },
  {
    slug: 'marketer',
    title: 'Маркетолог',
    summary:
      'Отдельная роль: ведёт свои компании и оценивает качество лидов (квалификация) для рекламы.',
    icon: 'lucide:megaphone',
    file: '04-marketer.md',
  },
];

const DOCS_DIR = join(process.cwd(), '.docs', 'user-guide');

export function getHelpDoc(slug: string): HelpDoc | undefined {
  return HELP_DOCS.find((doc) => doc.slug === slug);
}

/** Сырой markdown раздела (без ведущего `# Заголовок` — он выводится отдельно). */
export function readHelpMarkdown(file: string): string {
  const raw = readFileSync(join(DOCS_DIR, file), 'utf8');
  return stripLeadingH1(raw);
}

function stripLeadingH1(md: string): string {
  // Первый `# Заголовок` рендерится как <h1> страницы из HelpDoc.title —
  // убираем его из тела, чтобы не дублировать.
  return md.replace(/^\s*#\s+.+\r?\n+/, '');
}

/**
 * Имена скриншотов, реально лежащих в `public/user-guide/`. Руководство ссылается
 * на несколько картинок, которых ещё нет (напр. `04-marketer-qualification.png`);
 * их фигуры пропускаются, а не рендерятся «битыми». Читается один раз при старте.
 */
let existingImagesCache: Set<string> | null = null;

export function getExistingScreenshotNames(): Set<string> {
  if (existingImagesCache) return existingImagesCache;
  try {
    const files = readdirSync(join(process.cwd(), 'public', 'user-guide'));
    existingImagesCache = new Set(files.filter((f) => f.toLowerCase().endsWith('.png')));
  } catch {
    existingImagesCache = new Set();
  }
  return existingImagesCache;
}
