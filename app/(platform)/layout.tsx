import ThemeProvider from '@/components/providers/ThemeProvider';
import PlatformShell from '@/components/platform/PlatformShell';
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
      <PlatformShell role={role}>{children}</PlatformShell>
    </ThemeProvider>
  );
}
