import type { Metadata } from 'next';
import Link from 'next/link';
import { PageContent } from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import PipelineBoard from '@/components/pipeline/PipelineBoard';
import IconButton from '@/components/ui/IconButton';

const PIPELINE_SETTINGS_PATH = '/admin/pipeline-settings';

export const metadata: Metadata = {
  title: 'Воронка продаж',
};

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5 text-[var(--color-text-secondary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      className="h-5 w-5 text-[var(--color-text-secondary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export default function PipelinePage() {
  return (
    <>
      <PageHeader
        title="Воронка продаж"
        actions={
          <>
            <IconButton aria-label="Поиск" icon={<SearchIcon />} />
            <IconButton aria-label="Уведомления" icon={<BellIcon />} />
            <span
              className="mx-1 h-5 w-px bg-[var(--color-border)]"
              aria-hidden="true"
            />
            <Link
              href={PIPELINE_SETTINGS_PATH}
              className="
                inline-flex h-[36px] items-center justify-center gap-2
                rounded-[6px] border border-[var(--color-border)] border-[0.5px]
                bg-[var(--color-bg-surface-2)] px-[14px]
                text-[13px] font-medium text-[var(--color-text-primary)]
                transition-all duration-150
                hover:bg-[var(--color-bg-surface)]
              "
            >
              <span className="h-4 w-4 flex-shrink-0">
                <SettingsIcon />
              </span>
              Настроить этапы
            </Link>
          </>
        }
      />

      <PageContent>
        <PipelineBoard />
      </PageContent>
    </>
  );
}
