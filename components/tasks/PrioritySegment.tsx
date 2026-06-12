'use client';

import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';

export type TaskPriority = 'low' | 'normal' | 'high';

const OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Низкий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'high', label: 'Высокий' },
];

interface PrioritySegmentProps {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}

export default function PrioritySegment({ value, onChange }: PrioritySegmentProps): ReactNode {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-[var(--color-text-secondary)]">Приоритет</span>
      <div
        className="
          flex overflow-hidden rounded-[6px]
          border border-[var(--color-border)] border-[0.5px]
        "
        role="group"
        aria-label="Приоритет"
      >
        {OPTIONS.map((option, index) => {
          const isActive = value === option.value;
          const isLast = index === OPTIONS.length - 1;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`
                flex h-[38px] flex-1 items-center justify-center gap-1
                text-[13px] transition-colors duration-150
                ${!isLast ? 'border-r border-[var(--color-border)] border-[0.5px]' : ''}
                ${isActive
                  ? 'bg-[#ECFDF5] font-medium text-[#10B981]'
                  : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]'
                }
              `}
              aria-pressed={isActive}
            >
              {option.label}
              {isActive && (
                <Icon icon="tabler:check" className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
