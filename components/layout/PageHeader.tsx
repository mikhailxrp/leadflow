import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  onMenuClick?: () => void;
}

export default function PageHeader({ title, actions, onMenuClick }: PageHeaderProps) {
  return (
    <header
      className={`
        h-[56px] flex-shrink-0
        bg-[var(--color-bg-surface)]
        border-b border-[var(--color-border)] border-[0.5px]
        flex items-center justify-between
        px-6
        sticky top-0 z-30
      `}
    >
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            className="lg:hidden p-1 -ml-1 text-[var(--color-text-secondary)]"
            onClick={onMenuClick}
            aria-label="Меню"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)] tracking-[-0.01em]">
          {title}
        </h1>
      </div>

      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
}
