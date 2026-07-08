import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { toCompanyActor } from '@/lib/auth/requireCompanyAccess';
import { getLeadsWithRisk } from '@/lib/leads/getLeads';
import { getManagers } from '@/lib/leads/getManagers';
import { leadsQuerySchema } from '@/lib/validations/leads';
import type { CompanySession } from '@/types/session';
import LeadsFilters from '@/components/leads/LeadsFilters';
import LeadsTable from '@/components/leads/LeadsTable';
import LeadsPagination from '@/components/leads/LeadsPagination';
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

interface LeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const session = await auth();

  if (!session || session.kind !== 'company') {
    redirect('/login');
  }

  const actor = toCompanyActor(session as CompanySession);

  const rawParams = await searchParams;

  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(rawParams)) {
    if (typeof val === 'string') normalized[key] = val;
    else if (Array.isArray(val)) normalized[key] = val[0] ?? '';
  }

  const params = leadsQuerySchema.parse(normalized);

  const [{ leads, total, page, pageSize }, managers] = await Promise.all([
    getLeadsWithRisk(params, actor),
    getManagers(actor.companyId),
  ]);

  return (
    <>
      <PageHeader
        title="Лиды"
        actions={
          actor.actor === 'user' ? (
            <Link href="/leads/new">
              <Button variant="primary" size="md" icon={<PlusIcon />}>
                Добавить лид
              </Button>
            </Link>
          ) : undefined
        }
      />

      <PageContent>
        <div className="flex flex-col gap-4">
          <Suspense
            fallback={
              <div className="h-[52px] animate-pulse rounded-[12px] bg-[var(--color-bg-surface-2)]" />
            }
          >
            <LeadsFilters managers={managers} />
          </Suspense>

          {leads.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16">
              <p className="text-[14px] text-[var(--color-text-secondary)]">Лиды не найдены</p>
            </div>
          ) : (
            <LeadsTable leads={leads} />
          )}

          {total > 0 && (
            <Suspense fallback={<div className="h-7" />}>
              <LeadsPagination total={total} page={page} pageSize={pageSize} />
            </Suspense>
          )}
        </div>
      </PageContent>
    </>
  );
}
