/**
 * Утилиты рендера руководства пользователя (раздел «Помощь»).
 *
 * Руководство писалось как markdown с плейсхолдерами скриншотов вида
 *   > 🖼️ **Скриншот —** `images/xxx.png` На скриншоте: ...
 * `preprocessHelpMarkdown` превращает такие блоки в обычные изображения,
 * указывающие на статику `/user-guide/xxx.png`, а «текстовые» выноски
 * (💡/⚠️/📌 и обычные цитаты) оставляет цитатами — их оформляет рендерер.
 */

export interface HelpHeading {
  id: string;
  text: string;
}

/** slug для id заголовка и якоря в оглавлении. Сохраняет кириллицу. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[«»"'`*]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Убрать inline-разметку, чтобы текст заголовка совпал с тем, что рендерит react-markdown. */
function stripInline(md: string): string {
  return md
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

/** Заголовки второго уровня (##) для правого оглавления «На этой странице». */
export function extractHeadings(md: string): HelpHeading[] {
  const lines = md.split('\n');
  const out: HelpHeading[] = [];
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      const text = stripInline(match[1]);
      out.push({ id: slugify(text), text });
    }
  }

  return out;
}

const SCREENSHOT_MARKER = '🖼️';

/**
 * Преобразует плейсхолдеры скриншотов в изображения, оставляя остальные цитаты
 * как есть. Скриншот, файла которого нет в `existing`, пропускается целиком —
 * без «битой» картинки.
 */
export function preprocessHelpMarkdown(md: string, existing: Set<string>): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;
  let inFence = false;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      out.push(line);
      i++;
      continue;
    }

    if (!inFence && /^>\s?/.test(line)) {
      const group: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        group.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }

      const blockText = group.join(' ');
      if (blockText.includes(SCREENSHOT_MARKER)) {
        const shot = extractScreenshot(blockText);
        if (shot.file && existing.has(shot.file)) {
          out.push('');
          out.push(`![${shot.caption}](/user-guide/${shot.file})`);
          out.push('');
        }
        // файла нет → фигура пропускается
      } else {
        for (const g of group) out.push(`> ${g}`);
      }
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join('\n');
}

function extractScreenshot(blockText: string): { file: string | null; caption: string } {
  const fileMatch = blockText.match(/images\/([A-Za-z0-9._-]+\.png)/);
  const file = fileMatch ? fileMatch[1] : null;

  let caption = blockText
    .replace(/🖼️/g, '')
    .replace(/\*\*Скриншот\s*—?\*\*/gi, '')
    .replace(/Скриншот\s*—/gi, '')
    .replace(/images\/[A-Za-z0-9._-]+\.png/g, '')
    .replace(/`/g, '')
    .replace(/[[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  caption = caption.replace(/^На\s+скриншоте\s*(\([^)]*\))?\s*:?\s*/i, '').trim();
  caption = caption.replace(/^[—:\-\s]+/, '').trim();

  return { file, caption };
}
