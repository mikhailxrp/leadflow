import { type ReactNode } from 'react';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  TODO: {
    label: 'Новая',
    bgClass: 'bg-[var(--color-bg-surface-2)]',
    textClass: 'text-[var(--color-text-secondary)]',
  },
  IN_PROGRESS: {
    label: 'В работе',
    bgClass: 'bg-[#EFF6FF]',
    textClass: 'text-[#3B82F6]',
  },
  DONE: {
    label: 'Выполнена',
    bgClass: 'bg-[var(--color-primary-light)]',
    textClass: 'text-[var(--color-primary-dark)]',
  },
  CANCELLED: {
    label: 'Отменена',
    bgClass: 'bg-[var(--color-bg-surface-2)]',
    textClass: 'text-[var(--color-text-tertiary)]',
  },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export default function TaskStatusBadge({
  status,
  className = '',
}: TaskStatusBadgeProps): ReactNode {
  const cfg = STATUS_CONFIG[status];

  return (
    <span
      className={`
        inline-flex shrink-0 items-center rounded-[20px]
        px-2 py-0.5 text-[11px] font-medium
        ${cfg.bgClass} ${cfg.textClass} ${className}
      `}
    >
      {cfg.label}
    </span>
  );
}
