'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import type { PlatformRole } from '@prisma/client';
import PlatformSidebar from '@/components/platform/PlatformSidebar';

interface PlatformShellProps {
  role: PlatformRole;
  children: ReactNode;
}

/**
 * Каркас платформенной зоны с адаптивным сайдбаром:
 * ≥ lg — постоянная колонка 220px; < lg — drawer + мобильная шапка с бургером.
 */
export default function PlatformShell({
  role,
  children,
}: PlatformShellProps): ReactNode {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-page)]">
      <PlatformSidebar
        role={role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Мобильная шапка с бургером (< lg) */}
        <header
          className="
            sticky top-0 z-30 flex h-14 flex-shrink-0 items-center gap-3
            border-b border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)] px-4 lg:hidden
          "
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Открыть меню"
            className="
              -ml-1 flex h-9 w-9 items-center justify-center rounded-[6px]
              text-[var(--color-text-secondary)] transition-colors duration-150
              hover:bg-[var(--color-bg-surface-2)] hover:text-[var(--color-text-primary)]
            "
          >
            <Icon icon="lucide:menu" className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" aria-hidden="true" />
            <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Лид-Канал
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
