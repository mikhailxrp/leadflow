import type { JSX } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import RecentLeads from '@/components/dashboard/RecentLeads';
import LeadsChart from '@/components/dashboard/LeadsChart';
import StatsRow from '@/components/dashboard/StatsRow';
import { PageContent } from '@/components/layout/AppLayout';
import LogoutButton from '@/components/layout/LogoutButton';
import PageHeader from '@/components/layout/PageHeader';
import IconButton from '@/components/ui/IconButton';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Дашборд',
};

function BellIcon(): JSX.Element {
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
            <IconButton aria-label="Уведомления" icon={<BellIcon />} />
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
