'use client';

import { type ReactNode } from 'react';
import { useSidebarCollapse } from '@/components/providers/SidebarCollapseProvider';

interface AppLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

/**
 * Main app layout:
 * ┌──────────────┬────────────────────────────────────────┐
 * │   Sidebar    │  Header + Content                      │
 * │  220/64px    │                                        │
 * │   (dark)     │  padding: 24px                         │
 * └──────────────┴────────────────────────────────────────┘
 */
export default function AppLayout({ sidebar, children }: AppLayoutProps) {
  const { collapsed } = useSidebarCollapse();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-page)] font-sans print:h-auto print:overflow-visible">
      {/* Sidebar spacer for desktop (sidebar is fixed) */}
      <div
        className={`hidden flex-shrink-0 transition-[width] duration-200 print:hidden lg:block ${collapsed ? 'w-[64px]' : 'w-[220px]'}`}
      />

      {sidebar}

      {/* Main content column — min-h-0 lets inner overflow-auto scroll instead of body */}
      <div className="flex min-h-0 flex-1 flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}

// ─── Content area wrapper ─────────────────────────────────────────
interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className = '' }: PageContentProps) {
  return (
    <main className={`min-h-0 flex-1 overflow-auto p-6 ${className}`}>
      <div className="mx-auto w-full max-w-[1460px]">{children}</div>
    </main>
  );
}
