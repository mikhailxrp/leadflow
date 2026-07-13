import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import NotificationBell from '@/components/notifications/NotificationBell';
import ReportsPage from '@/components/reports/ReportsPage';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { toCompanyActor } from '@/lib/auth/requireCompanyAccess';
import { getSummary } from '@/lib/reports/getSummary';
import { resolveReportPeriod } from '@/lib/validations/reports';
import type { CompanySession } from '@/types/session';

export const metadata: Metadata = {
  title: 'Отчёты',
};

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function ReportsIndexPage() {
  const session = await auth();

  if (!session || session.kind !== 'company') {
    redirect('/login');
  }

  const actor = toCompanyActor(session as CompanySession);

  if (actor.actor === 'user' && !hasMinRole(actor.role, 'HEAD')) {
    redirect('/today');
  }

  const { from, to } = resolveReportPeriod({});
  const initialSummary = await getSummary(actor.companyId, from, to);

  return (
    <>
      <PageHeader
        title="Отчёты"
        actions={actor.actor === 'user' ? <NotificationBell /> : null}
      />

      <PageContent>
        <ReportsPage
          initialSummary={initialSummary}
          initialFrom={toDayKey(from)}
          initialTo={toDayKey(to)}
        />
      </PageContent>
    </>
  );
}
