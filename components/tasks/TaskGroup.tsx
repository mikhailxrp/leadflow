'use client';

import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import TaskRow, { type TaskGroupType, type TaskItem } from '@/components/tasks/TaskRow';

interface GroupConfig {
  title: string;
  icon: string;
}

const GROUP_CONFIG: Record<TaskGroupType, GroupConfig> = {
  overdue: {
    title: 'Просроченные',
    icon: 'tabler:alert-circle',
  },
  today: {
    title: 'Сегодня',
    icon: 'tabler:clock',
  },
  upcoming: {
    title: 'Предстоящие',
    icon: 'tabler:calendar',
  },
};

const GROUP_ICON_CLASSES: Record<TaskGroupType, string> = {
  overdue: 'text-[#EF4444]',
  today: 'text-[#10B981]',
  upcoming: 'text-[#64748B]',
};

const GROUP_TEXT_CLASSES: Record<TaskGroupType, string> = {
  overdue: 'text-[#EF4444]',
  today: 'text-[#10B981]',
  upcoming: 'text-[#64748B]',
};

const GROUP_BADGE_CLASSES: Record<TaskGroupType, string> = {
  overdue: 'bg-[#FEF2F2] text-[#EF4444]',
  today: 'bg-[#ECFDF5] text-[#10B981]',
  upcoming: 'bg-[var(--color-bg-surface-2)] text-[#64748B]',
};

interface TaskGroupProps {
  group: TaskGroupType;
  tasks: TaskItem[];
  onToggleDone: (id: string) => void;
  onLeadClick: (leadId: string) => void;
}

export default function TaskGroup({
  group,
  tasks,
  onToggleDone,
  onLeadClick,
}: TaskGroupProps): ReactNode {
  if (tasks.length === 0) return null;

  const config = GROUP_CONFIG[group];

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon
          icon={config.icon}
          className={`h-4 w-4 shrink-0 ${GROUP_ICON_CLASSES[group]}`}
          aria-hidden="true"
        />
        <h2 className={`text-[13px] font-medium ${GROUP_TEXT_CLASSES[group]}`}>
          {config.title}
        </h2>
        <span
          className={`
            inline-flex items-center rounded-[20px] px-2 py-0.5
            text-[12px] font-medium
            ${GROUP_BADGE_CLASSES[group]}
          `}
        >
          {tasks.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskRow
              task={task}
              onToggleDone={onToggleDone}
              onLeadClick={onLeadClick}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
