import type { Metadata } from 'next';
import Link from 'next/link';
import LeadsFilters from '@/components/leads/LeadsFilters';
import { PageContent } from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Лиды',
};

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title="Лиды"
        actions={
          <Link href="/leads/new">
            <Button variant="primary" size="md" icon={<PlusIcon />}>
              Добавить лид
            </Button>
          </Link>
        }
      />

      <PageContent>
        <div className="flex flex-col gap-4">
          <LeadsFilters />

          <div className="flex items-center justify-center rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16">
            <p className="text-[14px] text-[var(--color-text-secondary)]">Пока нет лидов</p>
          </div>

        </div>
      </PageContent>
    </>
  );
}
