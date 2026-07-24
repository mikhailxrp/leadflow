import { isValidElement, type ReactNode } from 'react';
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import HelpFigure from '@/components/help/HelpFigure';
import { slugify } from '@/lib/help/markdown';

/** Соответствие файлов руководства маршрутам раздела «Помощь». */
const MD_ROUTE: Record<string, string> = {
  'README.md': '/help',
  '00-intro.md': '/help/intro',
  '01-manager.md': '/help/manager',
  '02-head.md': '/help/head',
  '03-admin.md': '/help/admin',
  '04-marketer.md': '/help/marketer',
  '05-ad-tracking-fields.md': '/help/ad-tracking-fields',
  '06-developer-integrations.md': '/help/developer-integrations',
};

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement(node)) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

type Callout = {
  border: string;
  bg: string;
  text: string;
};

/** Тип выноски по ведущему эмодзи цитаты. */
function classifyCallout(text: string): Callout {
  const t = text.trimStart();
  if (t.startsWith('💡')) {
    return {
      border: 'var(--color-primary)',
      bg: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
      text: 'var(--color-text-primary)',
    };
  }
  if (t.startsWith('⚠️')) {
    return {
      border: 'var(--color-warning)',
      bg: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
      text: 'var(--color-text-primary)',
    };
  }
  if (t.startsWith('📌')) {
    return {
      border: 'var(--color-info)',
      bg: 'color-mix(in srgb, var(--color-info) 8%, transparent)',
      text: 'var(--color-text-primary)',
    };
  }
  return {
    border: 'var(--color-border)',
    bg: 'var(--color-bg-surface-2)',
    text: 'var(--color-text-secondary)',
  };
}

const components: Components = {
  h2({ children }) {
    const id = slugify(nodeText(children));
    return (
      <h2
        id={id}
        className="group scroll-mt-24 mt-12 mb-4 border-b-[0.5px] border-[var(--color-border)] pb-2 text-[20px] font-semibold text-[var(--color-text-primary)]"
      >
        <a href={`#${id}`} className="no-underline">
          {children}
        </a>
      </h2>
    );
  },
  h3({ children }) {
    const id = slugify(nodeText(children));
    return (
      <h3
        id={id}
        className="scroll-mt-24 mt-8 mb-3 text-[15px] font-semibold text-[var(--color-text-primary)]"
      >
        {children}
      </h3>
    );
  },
  h4({ children }) {
    return (
      <h4 className="mt-6 mb-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
        {children}
      </h4>
    );
  },
  p({ node, children }) {
    // Картинка на отдельной строке markdown оборачивается в <p>, но наш рендер
    // <img> возвращает блочный <figure> — <figure>/<div> внутри <p> невалидны и
    // вызывают ошибку гидрации. Если абзац состоит только из картинки, не
    // оборачиваем его в <p>.
    const kids = (node?.children ?? []) as Array<{ type: string; tagName?: string; value?: string }>;
    const hasImg = kids.some((c) => c.type === 'element' && c.tagName === 'img');
    const onlyImg =
      hasImg &&
      kids.every(
        (c) =>
          (c.type === 'element' && c.tagName === 'img') ||
          (c.type === 'text' && (c.value ?? '').trim() === ''),
      );
    if (onlyImg) return <>{children}</>;

    return (
      <p className="my-4 break-words text-[14.5px] leading-[1.75] text-[var(--color-text-primary)]">
        {children}
      </p>
    );
  },
  a({ href, children }) {
    const h = href ?? '';
    const linkClass =
      'font-medium break-words text-[var(--color-primary)] underline decoration-[var(--color-primary)]/30 underline-offset-2 transition-colors hover:decoration-[var(--color-primary)]';

    if (/^https?:\/\//.test(h)) {
      return (
        <a href={h} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {children}
        </a>
      );
    }

    const mdMatch = /^([\w-]+\.md)(#.*)?$/.exec(h);
    if (mdMatch) {
      const route = MD_ROUTE[mdMatch[1]] ?? '/help';
      return (
        <Link href={`${route}${mdMatch[2] ?? ''}`} className={linkClass}>
          {children}
        </Link>
      );
    }

    return (
      <a href={h} className={linkClass}>
        {children}
      </a>
    );
  },
  strong({ children }) {
    return <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>;
  },
  ul({ children }) {
    return (
      <ul className="my-4 list-disc space-y-2 pl-6 text-[14.5px] leading-[1.7] text-[var(--color-text-primary)] marker:text-[var(--color-text-tertiary)]">
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="my-4 list-decimal space-y-2 pl-6 text-[14.5px] leading-[1.7] text-[var(--color-text-primary)] marker:text-[var(--color-text-tertiary)]">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="break-words pl-1">{children}</li>;
  },
  blockquote({ children }) {
    const callout = classifyCallout(nodeText(children));
    return (
      <blockquote
        className="my-5 rounded-r-[8px] border-l-[3px] px-4 py-1 [&>p]:my-2.5 [&>p]:text-[14px]"
        style={{ borderColor: callout.border, background: callout.bg, color: callout.text }}
      >
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="my-5 w-full overflow-x-auto rounded-[8px] border-[0.5px] border-[var(--color-border)] print:overflow-visible print:break-inside-avoid">
        <table className="w-full border-collapse text-[13.5px] print:text-[11px]">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-[var(--color-bg-surface-2)]">{children}</thead>;
  },
  tr({ children }) {
    return <tr className="border-b-[0.5px] border-[var(--color-border)] last:border-0">{children}</tr>;
  },
  th({ children }) {
    return (
      <th className="px-3.5 py-2.5 text-left align-top font-semibold text-[var(--color-text-primary)]">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="px-3.5 py-2.5 align-top text-[var(--color-text-secondary)] leading-[1.6]">
        {children}
      </td>
    );
  },
  code({ className, children }) {
    const text = String(children ?? '');
    const isBlock = /language-/.test(className ?? '') || text.includes('\n');
    if (isBlock) {
      return <code className="font-mono text-[12.5px] leading-[1.6]">{children}</code>;
    }
    return (
      <code className="break-words rounded-[4px] bg-[var(--color-bg-surface-2)] px-1.5 py-0.5 font-mono text-[12.5px] text-[var(--color-primary)]">
        {children}
      </code>
    );
  },
  pre({ children }) {
    return (
      <pre className="my-5 overflow-x-auto rounded-[8px] border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface-2)] p-4 text-[var(--color-text-primary)] whitespace-pre print:overflow-visible print:whitespace-pre-wrap print:break-words print:break-inside-avoid">
        {children}
      </pre>
    );
  },
  img({ src, alt }) {
    if (typeof src !== 'string') return null;
    return <HelpFigure src={src} alt={alt ?? ''} />;
  },
  hr() {
    return <hr className="my-8 border-0 border-t-[0.5px] border-[var(--color-border)]" />;
  },
};

interface MarkdownDocProps {
  content: string;
}

export default function MarkdownDoc({ content }: MarkdownDocProps): ReactNode {
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
