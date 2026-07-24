import type { ReactNode } from 'react';

/**
 * Примитивы для мобильного представления таблиц платформы (< lg).
 * Каждая строка таблицы становится карточкой «поле: значение» — без
 * горизонтального скролла на узких экранах (от 320px).
 */

export function MobileCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div
      className={`
        rounded-[12px] border border-[0.5px] border-[var(--color-border)]
        bg-[var(--color-bg-surface)] p-4
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function MobileCardRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="flex-shrink-0 text-[12px] font-medium text-[var(--color-text-secondary)]">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-[13px] text-[var(--color-text-primary)]">
        {children}
      </span>
    </div>
  );
}
