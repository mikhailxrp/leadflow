'use client';

import { type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '@iconify/react';

export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';
export type TaskGroupType = 'overdue' | 'today' | 'upcoming';
export type LeadIconType = 'phone' | 'building' | 'user';
export type DateIconType = 'calendar' | 'calendar-event' | 'clock';

export interface TaskItem {
  id: string;
  title: string;
  lead: {
    id: string;
    name: string;
    icon: LeadIconType;
  };
  assignee: string;
  dateLabel: string;
  dateIcon?: DateIconType;
  isOverdueDate?: boolean;
  status: TaskStatus;
  group: TaskGroupType;
  done?: boolean;
}

const GROUP_BORDER_CLASSES: Record<TaskGroupType, string> = {
  overdue: 'border-l-[#EF4444]',
  today: 'border-l-[#10B981]',
  upcoming: 'border-l-[#94A3B8]',
};

const LEAD_ICON_MAP: Record<LeadIconType, string> = {
  phone: 'tabler:phone',
  building: 'tabler:building',
  user: 'tabler:user',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнена',
};

interface TaskRowProps {
  task: TaskItem;
  onToggleDone: (id: string) => void;
  onTaskClick: (task: TaskItem) => void;
}

export default function TaskRow({ task, onToggleDone, onTaskClick }: TaskRowProps): ReactNode {
  const isDone = task.done || task.status === 'DONE';
  const dateIcon = task.dateIcon ?? 'calendar';

  function handleRowClick(): void {
    onTaskClick(task);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTaskClick(task);
    }
  }

  function handleCheckboxClick(event: React.MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    if (!isDone) {
      // TODO: PATCH /api/tasks/[id] { status: 'DONE' }
      onToggleDone(task.id);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={`
        flex cursor-pointer items-center gap-3 rounded-[6px]
        border border-[var(--color-border)] border-[0.5px]
        border-l-[3px] bg-[var(--color-bg-surface)]
        p-[14px_16px] transition-colors duration-150
        hover:bg-[var(--color-bg-surface-2)]
        ${GROUP_BORDER_CLASSES[task.group]}
      `}
    >
      <button
        type="button"
        onClick={handleCheckboxClick}
        className={`
          flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center
          rounded-full border-[1.5px] transition-colors duration-150
          hover:border-[#10B981]
          ${isDone
            ? 'border-[#10B981] bg-[#10B981]'
            : 'border-[var(--color-border)] bg-transparent'
          }
        `}
        aria-label={isDone ? 'Задача выполнена' : 'Отметить выполненной'}
        aria-pressed={isDone}
      >
        {isDone && (
          <Icon icon="tabler:check" className="h-3 w-3 text-white" aria-hidden="true" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`
            text-[14px] font-medium text-[var(--color-text-primary)]
            ${isDone ? 'line-through opacity-60' : ''}
          `}
        >
          {task.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <Icon
              icon={LEAD_ICON_MAP[task.lead.icon]}
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="text-[var(--color-text-primary)]">{task.lead.name}</span>
          </span>

          <span className="text-[var(--color-text-tertiary)]" aria-hidden="true">|</span>

          <span className="flex items-center gap-1.5">
            <Icon icon="tabler:user" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {task.assignee}
          </span>

          <span className="text-[var(--color-text-tertiary)]" aria-hidden="true">|</span>

          <span
            className={`
              flex items-center gap-1.5
              ${task.isOverdueDate
                ? 'text-[#EF4444]'
                : 'text-[var(--color-text-secondary)]'
              }
            `}
          >
            <Icon
              icon={`tabler:${dateIcon}`}
              className={`
                h-3.5 w-3.5 shrink-0
                ${task.isOverdueDate ? 'text-[#EF4444]' : 'text-[var(--color-text-secondary)]'}
              `}
              aria-hidden="true"
            />
            {task.dateLabel}
          </span>
        </div>
      </div>

      <span
        className={`
          shrink-0 text-[13px]
          ${task.status === 'IN_PROGRESS' && !isDone
            ? 'text-[#B45309]'
            : 'text-[var(--color-text-secondary)]'
          }
        `}
      >
        {isDone ? STATUS_LABELS.DONE : STATUS_LABELS[task.status]}
      </span>
    </div>
  );
}
