import type { JSX } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TodayBoard from '@/components/today/TodayBoard';
import TodayStatsRow from '@/components/today/TodayStatsRow';
import { PageContent } from '@/components/layout/AppLayout';
import LogoutButton from '@/components/layout/LogoutButton';
import PageHeader from '@/components/layout/PageHeader';
import NotificationBell from '@/components/notifications/NotificationBell';
import Avatar from '@/components/ui/Avatar';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayData } from '@/lib/today/getTodayData';

export const metadata: Metadata = {
  title: 'Сегодня',
};

function computeInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export default async function TodayPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  const { id: currentUserId, companyId, role } = session.user;
  const isAdmin = hasMinRole(role, 'ADMIN');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [data, dbUser, total, newToday, inProgress, deals] = await Promise.all([
    getTodayData(companyId, currentUserId),
    prisma.user.findUnique({
      where: { id: currentUserId, companyId },
      select: { name: true, avatarUrl: true },
    }),
    prisma.lead.count({ where: { companyId, assignedToId: currentUserId } }),
    prisma.lead.count({
      where: { companyId, assignedToId: currentUserId, createdAt: { gte: todayStart } },
    }),
    prisma.lead.count({ where: { companyId, assignedToId: currentUserId, closeType: null } }),
    prisma.lead.count({ where: { companyId, assignedToId: currentUserId, closeType: 'WON' } }),
  ]);

  const userInitials = computeInitials(dbUser?.name ?? '');

  const formattedDate = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      <PageHeader
        title="Сегодня"
        actions={
          <>
            <NotificationBell />
            <time className="hidden text-[13px] text-[var(--color-text-secondary)] sm:inline">
              {formattedDate}
            </time>
            <span className="hidden sm:inline-flex">
              <Avatar initials={userInitials} src={dbUser?.avatarUrl ?? undefined} size="sm" />
            </span>
            <LogoutButton />
          </>
        }
      />

      <PageContent>
        <div className="flex flex-col gap-6">
          <TodayStatsRow total={total} newToday={newToday} inProgress={inProgress} deals={deals} />
          <TodayBoard data={data} currentUserId={currentUserId} isAdmin={isAdmin} />
        </div>
      </PageContent>
    </>
  );
}
