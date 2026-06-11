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
    <div className="flex min-h-screen bg-[var(--color-bg-page)] font-sans">
      {/* Sidebar spacer for desktop (sidebar is fixed) */}
      <div className="hidden lg:block w-[220px] flex-shrink-0" />

      {sidebar}

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0">
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
    <main className={`flex-1 p-6 overflow-auto ${className}`}>
      {children}
    </main>
  );
}
