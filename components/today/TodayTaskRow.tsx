import { type ReactNode } from 'react';
import Link from 'next/link';
import { formatDueDateLabel } from '@/components/tasks/taskConstants';
import type { TodayTaskItem } from '@/types/today';

interface TodayTaskRowProps {
  task: TodayTaskItem;
}

export default function TodayTaskRow({ task }: TodayTaskRowProps): ReactNode {
  return (
    <Link
      href={`/leads/${task.leadId}`}
      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-bg-surface-2)]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
          {task.title}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-tertiary)]">
          {task.leadName ?? '—'}
        </p>
      </div>

      {task.dueDate && (
        <span className="whitespace-nowrap text-[12px] text-[var(--color-text-secondary)]">
          {formatDueDateLabel(task.dueDate)}
        </span>
      )}
    </Link>
  );
}
