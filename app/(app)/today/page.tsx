import type { JSX } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import RecentLeads from '@/components/dashboard/RecentLeads';
import LeadsChart from '@/components/dashboard/LeadsChart';
import StatsRow from '@/components/dashboard/StatsRow';
import { PageContent } from '@/components/layout/AppLayout';
import LogoutButton from '@/components/layout/LogoutButton';
import PageHeader from '@/components/layout/PageHeader';
import NotificationBell from '@/components/notifications/NotificationBell';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Дашборд',
};

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  const { companyId } = session.user;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [total, newToday, inProgress, deals] = await Promise.all([
    prisma.lead.count({ where: { companyId } }),
    prisma.lead.count({ where: { companyId, createdAt: { gte: todayStart } } }),
    prisma.lead.count({ where: { companyId, closeType: null } }),
    prisma.lead.count({ where: { companyId, closeType: 'WON' } }),
  ]);

  const formattedDate = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      <PageHeader
        title="Дашборд"
        actions={
          <>
            <NotificationBell />
            <time className="text-[13px] text-[var(--color-text-secondary)]">
              {formattedDate}
            </time>
            <LogoutButton />
          </>
        }
      />

      <PageContent>
        <div className="flex flex-col gap-6">
          <StatsRow total={total} newToday={newToday} inProgress={inProgress} deals={deals} />
          <LeadsChart />
          <RecentLeads />
        </div>
      </PageContent>
    </>
  );
}
