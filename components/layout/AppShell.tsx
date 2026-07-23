import { type ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserNotifications } from '@/lib/notifications/getUserNotifications';
import { parseNotificationPreferences } from '@/lib/notifications/preferences';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/users';
import ThemeProvider from '@/components/providers/ThemeProvider';
import SidebarCollapseProvider from '@/components/providers/SidebarCollapseProvider';
import AppLayout from '@/components/layout/AppLayout';
import Sidebar from '@/components/layout/Sidebar';
import ImpersonationBanner from '@/components/platform/ImpersonationBanner';
import MarketerBanner from '@/components/platform/MarketerBanner';
import SseProvider from '@/components/notifications/SseProvider';
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

  if (!session || session.kind !== 'company') {
    return <>{children}</>;
  }

  if (!session.user) {
    return <>{children}</>;
  }

  const { id, companyId, role, impersonatedByPlatformAdminId } = session.user;

  const dbUser = await prisma.user.findUnique({
    where: { id, companyId },
    select: { name: true, avatarUrl: true, notificationPreferences: true },
  });

  const userName = dbUser?.name ?? '';
  const userInitials = computeInitials(userName);
  const navItems = getNavItemsForRole(role);

  // Красная плашка «вы вошли под чужой личностью» рисуется для обеих платформенных
  // ролей, но с разным текстом и точкой выхода: маркетолог входит как реальный ADMIN
  // компании (impersonation), поэтому отличаем его от суперадмина по роли инициатора.
  let impersonationBanner: ReactNode = null;
  if (impersonatedByPlatformAdminId) {
    const initiator = await prisma.platformAdmin.findUnique({
      where: { id: impersonatedByPlatformAdminId },
      select: { role: true },
    });

    if (initiator?.role === 'MARKETER') {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });
      impersonationBanner = <MarketerBanner companyName={company?.name ?? ''} />;
    } else {
      impersonationBanner = <ImpersonationBanner />;
    }
  }

  const { items: initialItems, unreadCount: initialUnreadCount } = await getUserNotifications(
    id,
    companyId,
  );
  const soundEnabled = dbUser
    ? parseNotificationPreferences(dbUser.notificationPreferences).soundEnabled
    : DEFAULT_NOTIFICATION_PREFERENCES.soundEnabled;

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
          <SseProvider
            initialItems={initialItems}
            initialUnreadCount={initialUnreadCount}
            initialSoundEnabled={soundEnabled}
          >
            {impersonationBanner}
            {children}
          </SseProvider>
        </AppLayout>
      </SidebarCollapseProvider>
    </ThemeProvider>
  );
}
