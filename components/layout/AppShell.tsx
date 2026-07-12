import { type ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserNotifications } from '@/lib/notifications/getUserNotifications';
import ThemeProvider from '@/components/providers/ThemeProvider';
import SidebarCollapseProvider from '@/components/providers/SidebarCollapseProvider';
import AppLayout from '@/components/layout/AppLayout';
import Sidebar from '@/components/layout/Sidebar';
import ImpersonationBanner from '@/components/platform/ImpersonationBanner';
import MarketerBanner from '@/components/platform/MarketerBanner';
import SseProvider from '@/components/notifications/SseProvider';
import { getMarketerNavItems, getNavItemsForRole } from '@/constants/navItems';

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

  if (!session || session.kind !== 'company') {
    return <>{children}</>;
  }

  if (session.marketer) {
    const company = await prisma.company.findUnique({
      where: { id: session.marketer.companyId },
      select: { name: true },
    });

    return (
      <ThemeProvider storageKey={`theme_marketer_${session.marketer.platformAdminId}`}>
        <SidebarCollapseProvider storageKey={`sidebar_marketer_${session.marketer.platformAdminId}`}>
          <AppLayout
            sidebar={
              <Sidebar
                items={getMarketerNavItems()}
                userName="Маркетолог"
                userInitials="М"
              />
            }
          >
            <MarketerBanner companyName={company?.name ?? ''} />
            {children}
          </AppLayout>
        </SidebarCollapseProvider>
      </ThemeProvider>
    );
  }

  if (!session.user) {
    return <>{children}</>;
  }

  const { id, companyId, role, impersonatedByPlatformAdminId } = session.user;

  const dbUser = await prisma.user.findUnique({
    where: { id, companyId },
    select: { name: true, avatarUrl: true },
  });

  const userName = dbUser?.name ?? '';
  const userInitials = computeInitials(userName);
  const navItems = getNavItemsForRole(role);
  const isImpersonating = Boolean(impersonatedByPlatformAdminId);
  const { items: initialItems, unreadCount: initialUnreadCount } = await getUserNotifications(
    id,
    companyId,
  );

  return (
    <ThemeProvider storageKey={`theme_user_${id}`}>
      <SidebarCollapseProvider storageKey={`sidebar_user_${id}`}>
        <AppLayout
          sidebar={
            <Sidebar
              items={navItems}
              userName={userName}
              userInitials={userInitials}
              userAvatarUrl={dbUser?.avatarUrl}
              profileHref="/profile"
            />
          }
        >
          <SseProvider initialItems={initialItems} initialUnreadCount={initialUnreadCount}>
            {isImpersonating && <ImpersonationBanner />}
            {children}
          </SseProvider>
        </AppLayout>
      </SidebarCollapseProvider>
    </ThemeProvider>
  );
}
