'use client';

import { Icon } from '@iconify/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactNode } from 'react';

export interface StageData {
  id: string;
  name: string;
  leadCountLabel: string;
  leadsCount: number;
  dotColorClass?: string;
}

interface StageRowProps {
  stage: StageData;
  onDelete?: (stageId: string) => void;
}

function DragHandleIcon(): ReactNode {
  return (
    <svg
      className="h-4 w-4"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="9" cy="7" r="1.25" />
      <circle cx="15" cy="7" r="1.25" />
      <circle cx="9" cy="12" r="1.25" />
      <circle cx="15" cy="12" r="1.25" />
      <circle cx="9" cy="17" r="1.25" />
      <circle cx="15" cy="17" r="1.25" />
    </svg>
  );
}

export default function StageRow({ stage, onDelete }: StageRowProps): ReactNode {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const dragStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`
        flex h-[56px] items-center border-b border-[var(--color-border)] border-[0.5px] px-6
        last:border-0
        ${isDragging ? 'cursor-grabbing opacity-50' : ''}
      `}
    >
      <button
        type="button"
        className="
          flex w-8 flex-shrink-0 items-center justify-center
          text-[var(--color-text-tertiary)] cursor-grab
          touch-none
        "
        aria-label={`Перетащить этап «${stage.name}»`}
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>

      {stage.dotColorClass ? (
        <span
          className={`mr-3 h-2 w-2 flex-shrink-0 rounded-full ${stage.dotColorClass}`}
          aria-hidden="true"
        />
      ) : (
        <span className="mr-3 h-2 w-2 flex-shrink-0" aria-hidden="true" />
      )}

      <span className="flex-1 text-[14px] font-medium text-[var(--color-text-primary)]">
        {stage.name}
      </span>

      <span className="text-[13px] text-[var(--color-text-tertiary)]">
        {stage.leadCountLabel}
      </span>

      <button
        type="button"
        className="
          ml-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px]
          text-[var(--color-text-secondary)]
          transition-colors duration-150
          hover:bg-[var(--color-bg-surface-2)] hover:text-[#DC2626]
        "
        aria-label={`Удалить этап «${stage.name}»`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onDelete?.(stage.id)}
      >
        <Icon icon="lucide:trash-2" className="h-4 w-4" />
      </button>
    </div>
  );
}
