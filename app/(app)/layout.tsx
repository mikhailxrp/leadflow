import { type ReactNode } from 'react';
import { auth } from '@/lib/auth';
import ImpersonationBanner from '@/components/platform/ImpersonationBanner';

interface AppGroupLayoutProps {
  children: ReactNode;
}

export default async function AppGroupLayout({
  children,
}: AppGroupLayoutProps) {
  const session = await auth();
  const isImpersonating =
    session?.kind === 'company' &&
    Boolean(session.user?.impersonatedByPlatformAdminId);

  return (
    <>
      {isImpersonating ? <ImpersonationBanner /> : null}
      {children}
    </>
  );
}
