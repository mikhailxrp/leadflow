import { type ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/layout/AppLayout';
import Sidebar from '@/components/layout/Sidebar';
import ImpersonationBanner from '@/components/platform/ImpersonationBanner';
import { getNavItemsForRole } from '@/constants/navItems';

function computeInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

interface AppShellProps {
  children: ReactNode;
}

export default async function AppShell({ children }: AppShellProps): Promise<ReactNode> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return <>{children}</>;
  }

  const { id, companyId, role, impersonatedByPlatformAdminId } = session.user;

  const dbUser = await prisma.user.findUnique({
    where: { id, companyId },
    select: { name: true },
  });

  const userName = dbUser?.name ?? '';
  const userInitials = computeInitials(userName);
  const navItems = getNavItemsForRole(role);
  const isImpersonating = Boolean(impersonatedByPlatformAdminId);

  return (
    <AppLayout sidebar={<Sidebar items={navItems} userName={userName} userInitials={userInitials} />}>
      {isImpersonating && <ImpersonationBanner />}
      {children}
    </AppLayout>
  );
}
