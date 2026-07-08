import type { JSX } from 'react';
import Link from 'next/link';

export default function RecentLeads(): JSX.Element {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">
          Последние лиды
        </h2>
        <Link
          href="/leads"
          className="text-[13px] text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
        >
          Все лиды →
        </Link>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6 py-10 text-center">
        <p className="text-[13px] text-[var(--color-text-secondary)]">Пока нет лидов</p>
      </div>
    </section>
  );
}
