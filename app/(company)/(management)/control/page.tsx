import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import MobileMenuButton from '@/components/layout/MobileMenuButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import ManagerStatsTable from '@/components/control/ManagerStatsTable';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { getManagerStats } from '@/lib/control/getManagerStats';
import type { ControlPeriodDays } from '@/types/control';

export const metadata: Metadata = {
  title: 'Контроль',
};

const MS_PER_DAY = 86_400_000;
const DEFAULT_PERIOD_DAYS: ControlPeriodDays = 30;

export default async function ControlPage() {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  if (!hasMinRole(session.user.role, 'HEAD')) {
    redirect('/today');
  }

  const { companyId } = session.user;
  const periodStart = new Date();
  periodStart.setTime(periodStart.getTime() - DEFAULT_PERIOD_DAYS * MS_PER_DAY);
  const managers = await getManagerStats(companyId, periodStart);

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center
          border-b-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] px-4 sm:px-6
        "
      >
        <MobileMenuButton />
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
        </div>
      </header>

      <PageContent>
        <ManagerStatsTable initialData={managers} initialPeriodDays={DEFAULT_PERIOD_DAYS} />
      </PageContent>
    </>
  );
}
