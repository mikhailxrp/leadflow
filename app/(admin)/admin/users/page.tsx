import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import IconButton from '@/components/ui/IconButton';
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

function BellIcon() {
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
          <IconButton aria-label="Уведомления" icon={<BellIcon />} />
        </div>
      </header>

      <PageContent>
        <UsersTable initialUsers={initialUsers} currentUserId={currentUserId} />
      </PageContent>
    </>
  );
}
