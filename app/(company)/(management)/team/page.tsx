import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import MobileMenuButton from '@/components/layout/MobileMenuButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import TeamTable from '@/components/team/TeamTable';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { TeamMemberListItem } from '@/types/users';

export const metadata: Metadata = {
  title: 'Команда',
};

export default async function TeamPage() {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  if (!hasMinRole(session.user.role, 'HEAD')) {
    redirect('/today');
  }

  const { companyId } = session.user;

  const members: TeamMemberListItem[] = await prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      isBlocked: true,
    },
    orderBy: [{ role: 'desc' }, { name: 'asc' }],
  });

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
        <TeamTable members={members} />
      </PageContent>
    </>
  );
}
