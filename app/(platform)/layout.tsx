import ThemeProvider from '@/components/providers/ThemeProvider';
import PlatformSidebar from '@/components/platform/PlatformSidebar';
import { type ReactNode } from 'react';

interface PlatformGroupLayoutProps {
  children: ReactNode;
}

export default function PlatformGroupLayout({
  children,
}: PlatformGroupLayoutProps) {
  return (
    <ThemeProvider storageKey="theme_platform">
      <div className="flex min-h-screen bg-[var(--color-bg-page)]">
        <PlatformSidebar />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </ThemeProvider>
  );
}
