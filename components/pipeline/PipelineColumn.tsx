'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { type ReactNode } from 'react';
import PipelineCard from '@/components/pipeline/PipelineCard';

export interface PipelineLead {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  manager: string;
}

interface PipelineColumnProps {
  stageId: string;
  title: string;
  accentClass: string;
  leads: PipelineLead[];
  onCardClick?: (id: string) => void;
}

function PlusIcon(): ReactNode {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function PipelineColumn({
  stageId,
  title,
  accentClass,
  leads,
  onCardClick,
}: PipelineColumnProps): ReactNode {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  return (
    <section
      className="
        flex w-[272px] flex-shrink-0 flex-col overflow-hidden rounded-lg
        bg-[var(--color-bg-surface-2)]
      "
    >
      <div className={`h-[3px] ${accentClass}`} aria-hidden="true" />

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
              {title}
            </h2>
            <span
              className="
                inline-flex h-5 min-w-5 items-center justify-center rounded-[4px]
                bg-[var(--color-bg-surface)] px-1.5
                text-[11px] font-medium text-[var(--color-text-secondary)]
              "
            >
              {leads.length}
            </span>
          </div>

          <button
            type="button"
            className="
              flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px]
              text-[var(--color-text-secondary)]
              transition-colors duration-150
              hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]
            "
            aria-label={`Добавить лид в «${title}»`}
          >
            <PlusIcon />
          </button>
        </header>

        <div
          ref={setNodeRef}
          className={`
            custom-scrollbar flex min-h-[120px] flex-col gap-2 overflow-y-auto
            max-h-[calc(100vh-180px)] rounded-md
            ${isOver ? 'bg-[var(--color-bg-surface)]/60' : ''}
          `}
        >
          <SortableContext
            items={leads.map((lead) => lead.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.map((lead) => (
              <PipelineCard
                key={lead.id}
                id={lead.id}
                name={lead.name}
                phone={lead.phone}
                tags={lead.tags}
                manager={lead.manager}
                onClick={onCardClick}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </section>
  );
}
