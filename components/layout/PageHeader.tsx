import { type ReactNode } from 'react';
import MobileMenuButton from '@/components/layout/MobileMenuButton';

interface PageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header
      className={`
        h-[56px] flex-shrink-0
        bg-[var(--color-bg-surface)]
        border-b border-[var(--color-border)] border-[0.5px]
        flex items-center justify-between
        px-4 sm:px-6
        sticky top-0 z-30
      `}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <MobileMenuButton />
        <h1 className="truncate text-[20px] font-medium text-[var(--color-text-primary)] tracking-[-0.01em]">
          {title}
        </h1>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        {actions}
      </div>
    </header>
  );
}
