import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import NotificationBell from '@/components/notifications/NotificationBell';
import UsersTable, { type ApiUser } from '@/components/users/UsersTable';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isBlocked: true,
  createdAt: true,
} as const;

export const metadata: Metadata = {
  title: 'Пользователи',
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    redirect('/today');
  }

  const { companyId, id: currentUserId } = session.user;

  const usersRaw = await prisma.user.findMany({
    where: { companyId },
    select: USER_PUBLIC_SELECT,
    orderBy: { name: 'asc' },
  });

  const initialUsers: ApiUser[] = usersRaw.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center justify-end
          border-b-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] px-6
        "
      >
        <div className="flex items-center gap-3">
          <NotificationBell />
        </div>
      </header>

      <PageContent>
        <UsersTable initialUsers={initialUsers} currentUserId={currentUserId} />
      </PageContent>
    </>
  );
}
