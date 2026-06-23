import PlatformSidebar from '@/components/platform/PlatformSidebar';
import { type ReactNode } from 'react';

interface PlatformGroupLayoutProps {
  children: ReactNode;
}

export default function PlatformGroupLayout({
  children,
}: PlatformGroupLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg-base)]">
      <PlatformSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
