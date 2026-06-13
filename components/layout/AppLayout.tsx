import { type ReactNode } from 'react';

interface AppLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

/**
 * Main app layout:
 * ┌──────────────┬────────────────────────────────────────┐
 * │   Sidebar    │  Header + Content                      │
 * │   220px      │                                        │
 * │   (dark)     │  padding: 24px                         │
 * └──────────────┴────────────────────────────────────────┘
 */
export default function AppLayout({ sidebar, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-page)] font-sans">
      {/* Sidebar spacer for desktop (sidebar is fixed) */}
      <div className="hidden lg:block w-[220px] flex-shrink-0" />

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
      {children}
    </main>
  );
}
