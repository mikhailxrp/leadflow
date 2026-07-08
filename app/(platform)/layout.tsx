import ThemeProvider from '@/components/providers/ThemeProvider';
import PlatformSidebar from '@/components/platform/PlatformSidebar';
import { auth } from '@/lib/auth';
import { type ReactNode } from 'react';

interface PlatformGroupLayoutProps {
  children: ReactNode;
}

export default async function PlatformGroupLayout({
  children,
}: PlatformGroupLayoutProps) {
  const session = await auth();
  const role =
    session?.kind === 'platform' && session.admin
      ? session.admin.role
      : 'MARKETER';

  return (
    <ThemeProvider storageKey="theme_platform">
      <div className="flex min-h-screen bg-[var(--color-bg-page)]">
        <PlatformSidebar role={role} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </ThemeProvider>
  );
}
