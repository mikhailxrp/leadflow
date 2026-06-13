import type { Metadata } from 'next';
import Link from 'next/link';
import CreateLeadForm from '@/components/leads/CreateLeadForm';
import IconButton from '@/components/ui/IconButton';

export const metadata: Metadata = {
  title: 'Новый лид',
};

function BellIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

export default function CreateLeadPage() {
  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] shrink-0 items-center justify-between
          border-b-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6
        "
      >
        <nav aria-label="Хлебные крошки" className="flex items-center gap-2 text-[20px]">
          <Link
            href="/leads"
            className="font-medium text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
          >
            Лиды
          </Link>
          <span className="text-[var(--color-text-tertiary)]" aria-hidden="true">
            /
          </span>
          <span className="font-medium text-[var(--color-text-primary)]">Новый лид</span>
        </nav>

        <div className="flex items-center gap-3">
          <IconButton aria-label="Уведомления" icon={<BellIcon />} />
        </div>
      </header>

      <CreateLeadForm />
    </>
  );
}
