'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { type ReactNode } from 'react';
import PipelineCard from '@/components/pipeline/PipelineCard';
import type { BoardLeadCard } from '@/lib/pipeline/boardQuery';

interface PipelineColumnProps {
  stageId: string;
  title: string;
  color: string;
  leads: BoardLeadCard[];
  avgDaysOnStage: number | null;
  onCardClick?: (id: string) => void;
  readOnly?: boolean;
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
  color,
  leads,
  avgDaysOnStage,
  onCardClick,
  readOnly = false,
}: PipelineColumnProps): ReactNode {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  const avgLabel = avgDaysOnStage !== null ? `${Math.round(avgDaysOnStage)} дн.` : '—';

  return (
    <section
      className="
        flex w-full flex-col overflow-hidden rounded-lg
        bg-[var(--color-bg-surface-2)]
        md:w-[272px] md:flex-shrink-0
      "
    >
      <div className="h-[3px]" style={{ backgroundColor: color }} aria-hidden="true" />

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
            <span className="text-[11px] text-[var(--color-text-tertiary)]">
              {avgLabel}
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
                source={lead.source}
                assignedTo={lead.assignedTo}
                risk={lead.risk}
                closeType={lead.closeType}
                onClick={onCardClick}
                readOnly={readOnly}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </section>
  );
}
