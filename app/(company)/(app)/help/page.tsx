import { type ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { HELP_DOCS } from '@/lib/help/content';

export const metadata: Metadata = {
  title: 'Помощь',
};

export default function HelpOverviewPage(): ReactNode {
  return (
    <div className="max-w-[840px]">
      <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-text-tertiary)]">
        <Icon icon="lucide:life-buoy" className="h-3.5 w-3.5" aria-hidden="true" />
        Руководство пользователя
      </p>
      <h1 className="text-[28px] font-semibold leading-tight text-[var(--color-text-primary)]">
        Помощь по системе «Лид-Канал»
      </h1>
      <p className="mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[var(--color-text-secondary)]">
        Это инструкция по работе в системе для тех, кто пользуется ей каждый день. Написана простым
        языком — разберётся любой, даже если раньше не работал ни в одной CRM. Здесь нет технических
        деталей — только «куда нажать и что произойдёт».
      </p>

      <div
        className="mt-6 flex items-start gap-3 rounded-[10px] border-l-[3px] p-4"
        style={{
          borderColor: 'var(--color-primary)',
          background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
        }}
      >
        <Icon
          icon="lucide:sparkles"
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-primary)]"
          aria-hidden="true"
        />
        <p className="text-[13.5px] leading-[1.6] text-[var(--color-text-primary)]">
          <strong className="font-semibold">Если вы открыли систему впервые</strong> — начните с
          раздела{' '}
          <Link
            href="/help/intro"
            className="font-medium text-[var(--color-primary)] underline decoration-[var(--color-primary)]/30 underline-offset-2"
          >
            «Введение и словарик»
          </Link>
          . Там на пальцах объяснено, что такое лид, воронка, риск и другие слова. Дальше переходите
          к разделу своей роли.
        </p>
      </div>

      <h2 className="mt-10 mb-4 text-[16px] font-semibold text-[var(--color-text-primary)]">
        Разделы
      </h2>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {HELP_DOCS.map((doc, i) => (
          <Link
            key={doc.slug}
            href={`/help/${doc.slug}`}
            className="group flex flex-col rounded-[12px] border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 transition-colors hover:border-[var(--color-primary)]"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                <Icon icon={doc.icon} className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  {i + 1}
                </p>
                <h3 className="truncate text-[15px] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                  {doc.title}
                </h3>
              </div>
            </div>
            <p className="text-[13px] leading-[1.55] text-[var(--color-text-secondary)]">
              {doc.summary}
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-[13px] leading-[1.6] text-[var(--color-text-tertiary)]">
        Роли устроены как матрёшка: старшая умеет всё, что младшая, плюс больше. Поэтому в разделе
        «Руководитель» не повторяется то, что описано в «Менеджере», — только новое. «Маркетолог» —
        отдельная роль со своим набором возможностей.
      </p>
    </div>
  );
}
