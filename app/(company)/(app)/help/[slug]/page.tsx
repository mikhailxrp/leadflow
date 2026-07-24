import { type ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@iconify/react';
import MarkdownDoc from '@/components/help/MarkdownDoc';
import HelpToc from '@/components/help/HelpToc';
import DownloadPdfButton from '@/components/help/DownloadPdfButton';
import {
  HELP_DOCS,
  getExistingScreenshotNames,
  getHelpDoc,
  readHelpMarkdown,
} from '@/lib/help/content';
import { extractHeadings, preprocessHelpMarkdown } from '@/lib/help/markdown';

interface HelpDocPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return HELP_DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: HelpDocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getHelpDoc(slug);
  return { title: doc ? `Помощь — ${doc.title}` : 'Помощь' };
}

export default async function HelpDocPage({ params }: HelpDocPageProps): Promise<ReactNode> {
  const { slug } = await params;
  const doc = getHelpDoc(slug);
  if (!doc) notFound();

  const raw = readHelpMarkdown(doc.file);
  const content = preprocessHelpMarkdown(raw, getExistingScreenshotNames());
  const headings = extractHeadings(raw);

  const index = HELP_DOCS.findIndex((d) => d.slug === doc.slug);
  const prev =
    index <= 0
      ? { href: '/help', label: 'Обзор' }
      : { href: `/help/${HELP_DOCS[index - 1].slug}`, label: HELP_DOCS[index - 1].title };
  const next =
    index >= 0 && index < HELP_DOCS.length - 1
      ? { href: `/help/${HELP_DOCS[index + 1].slug}`, label: HELP_DOCS[index + 1].title }
      : null;

  return (
    <div className="flex gap-10">
      <article className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-text-tertiary)]">
              <Icon icon={doc.icon} className="h-3.5 w-3.5" aria-hidden="true" />
              Руководство
            </p>
            <h1 className="text-[28px] font-semibold leading-tight text-[var(--color-text-primary)]">
              {doc.title}
            </h1>
          </div>
          {doc.downloadable && (
            <div className="mt-1 flex-shrink-0">
              <DownloadPdfButton />
            </div>
          )}
        </div>
        <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
          {doc.summary}
        </p>
        {doc.downloadable && (
          <p className="mt-2 hidden text-[12px] text-[var(--color-text-tertiary)] print:block">
            Инструкция из системы «Лид-Канал», раздел «Помощь». Актуальная версия — всегда онлайн.
          </p>
        )}

        <div className="mt-8">
          <MarkdownDoc content={content} />
        </div>

        <nav className="mt-12 grid grid-cols-1 gap-3 border-t-[0.5px] border-[var(--color-border)] pt-6 sm:grid-cols-2 print:hidden">
          <Link
            href={prev.href}
            className="group flex flex-col rounded-[8px] border-[0.5px] border-[var(--color-border)] px-4 py-3 transition-colors hover:border-[var(--color-primary)]"
          >
            <span className="flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)]">
              <Icon icon="lucide:arrow-left" className="h-3.5 w-3.5" aria-hidden="true" />
              Назад
            </span>
            <span className="mt-0.5 text-[14px] font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
              {prev.label}
            </span>
          </Link>
          {next && (
            <Link
              href={next.href}
              className="group flex flex-col rounded-[8px] border-[0.5px] border-[var(--color-border)] px-4 py-3 text-right transition-colors hover:border-[var(--color-primary)] sm:col-start-2"
            >
              <span className="flex items-center justify-end gap-1 text-[12px] text-[var(--color-text-tertiary)]">
                Далее
                <Icon icon="lucide:arrow-right" className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="mt-0.5 text-[14px] font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                {next.label}
              </span>
            </Link>
          )}
        </nav>
      </article>

      <aside className="hidden w-[200px] flex-shrink-0 print:hidden xl:block">
        <div className="sticky top-8">
          <HelpToc headings={headings} />
        </div>
      </aside>
    </div>
  );
}
