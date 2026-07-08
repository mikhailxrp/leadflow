'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PipelineCardOverlay } from '@/components/pipeline/PipelineCard';
import PipelineColumn from '@/components/pipeline/PipelineColumn';
import Toast from '@/components/ui/Toast';
import type { ManagerOption } from '@/lib/leads/getManagers';
import type { BoardColumn, BoardLeadCard } from '@/lib/pipeline/boardQuery';

const DRAG_ACTIVATION_DISTANCE_PX = 8;
const DND_CONTEXT_ID = 'pipeline-board';

interface PipelineBoardProps {
  initialColumns: BoardColumn[];
  managers: ManagerOption[];
  showManagerFilter: boolean;
}

function buildBoardUrl(includeClosed: boolean, assignedToId: string | null): string {
  const params = new URLSearchParams();
  if (includeClosed) params.set('includeClosed', 'true');
  if (assignedToId) params.set('assignedToId', assignedToId);
  const qs = params.toString();
  return qs ? `/api/pipeline/board?${qs}` : '/api/pipeline/board';
}

function FilterIcon(): ReactNode {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function findLead(columns: BoardColumn[], leadId: string): BoardLeadCard | undefined {
  return columns.flatMap((col) => col.leads).find((lead) => lead.id === leadId);
}

function findColumnIdByLeadId(columns: BoardColumn[], leadId: string): string | undefined {
  return columns.find((col) => col.leads.some((lead) => lead.id === leadId))?.id;
}

function resolveOverColumnId(columns: BoardColumn[], overId: string): string | undefined {
  const colByLead = findColumnIdByLeadId(columns, overId);
  if (colByLead) return colByLead;
  if (columns.some((col) => col.id === overId)) return overId;
  return undefined;
}

function moveLead(
  columns: BoardColumn[],
  activeId: string,
  overId: string,
): BoardColumn[] {
  const activeLead = findLead(columns, activeId);
  const activeColId = findColumnIdByLeadId(columns, activeId);
  const overColId = resolveOverColumnId(columns, overId);

  if (!activeLead || !activeColId || !overColId) return columns;

  if (activeColId === overColId) {
    return columns.map((col) => {
      if (col.id !== activeColId) return col;
      const oldIndex = col.leads.findIndex((l) => l.id === activeId);
      const newIndex = col.leads.findIndex((l) => l.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return col;
      return { ...col, leads: arrayMove(col.leads, oldIndex, newIndex) };
    });
  }

  return columns.map((col) => {
    if (col.id === activeColId) {
      return { ...col, leads: col.leads.filter((l) => l.id !== activeId) };
    }
    if (col.id === overColId) {
      const leadsWithoutActive = col.leads.filter((l) => l.id !== activeId);
      const overIndex = leadsWithoutActive.findIndex((l) => l.id === overId);
      const nextLeads = [...leadsWithoutActive];
      if (overId === overColId || overIndex < 0) {
        nextLeads.push(activeLead);
      } else {
        nextLeads.splice(overIndex, 0, activeLead);
      }
      return { ...col, leads: nextLeads };
    }
    return col;
  });
}

export default function PipelineBoard({
  initialColumns,
  managers,
  showManagerFilter,
}: PipelineBoardProps): ReactNode {
  const router = useRouter();
  const [columns, setColumns] = useState<BoardColumn[]>(initialColumns);
  const [activeLead, setActiveLead] = useState<BoardLeadCard | null>(null);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; message?: string } | null>(null);

  const managerOptions = [
    { value: '', label: 'Ответственный' },
    ...managers.map((m) => ({ value: m.id, label: m.name })),
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    const lead = findLead(columns, String(event.active.id));
    setActiveLead(lead ?? null);
  }, [columns]);

  const handleDragEnd = useCallback(async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const prevColId = findColumnIdByLeadId(columns, activeId);
    const nextColumns = moveLead(columns, activeId, overId);
    const nextColId = findColumnIdByLeadId(nextColumns, activeId);

    if (!prevColId || !nextColId) return;

    if (prevColId === nextColId) {
      setColumns(nextColumns);
      return;
    }

    // Cross-column move: optimistic update then persist
    const prevColumns = columns;
    setColumns(nextColumns);

    try {
      const res = await fetch(`/api/leads/${activeId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: nextColId }),
      });

      if (!res.ok) throw new Error('stage-update-failed');
    } catch {
      setColumns(prevColumns);
      setToast({ title: 'Не удалось переместить лид', message: 'Попробуйте ещё раз' });
    }
  }, [columns]);

  const handleDragCancel = useCallback((): void => {
    setActiveLead(null);
  }, []);

  const handleCardClick = useCallback((id: string): void => {
    router.push(`/leads/${id}`);
  }, [router]);

  const refetchBoard = useCallback(async (
    nextIncludeClosed: boolean,
    nextManagerId: string | null,
  ): Promise<void> => {
    const res = await fetch(buildBoardUrl(nextIncludeClosed, nextManagerId));
    if (!res.ok) throw new Error('fetch-failed');
    const data = (await res.json()) as { columns: BoardColumn[] };
    setColumns(data.columns);
  }, []);

  const handleToggleClosed = useCallback(async (): Promise<void> => {
    const next = !includeClosed;
    setIncludeClosed(next);
    try {
      await refetchBoard(next, selectedManagerId);
    } catch {
      setIncludeClosed(!next);
      setToast({ title: 'Не удалось загрузить данные', message: 'Попробуйте ещё раз' });
    }
  }, [includeClosed, selectedManagerId, refetchBoard]);

  const handleManagerChange = useCallback(async (managerId: string): Promise<void> => {
    const nextManagerId = managerId || null;
    const prevManagerId = selectedManagerId;
    setSelectedManagerId(nextManagerId);
    try {
      await refetchBoard(includeClosed, nextManagerId);
    } catch {
      setSelectedManagerId(prevManagerId);
      setToast({ title: 'Не удалось загрузить данные', message: 'Попробуйте ещё раз' });
    }
  }, [includeClosed, selectedManagerId, refetchBoard]);

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showManagerFilter && (
          <div className="relative min-w-[180px] sm:max-w-[240px]">
            <label htmlFor="pipeline-manager-filter" className="sr-only">
              Ответственный
            </label>
            <select
              id="pipeline-manager-filter"
              value={selectedManagerId ?? ''}
              onChange={(e) => { void handleManagerChange(e.target.value); }}
              className="
                h-[36px] w-full appearance-none
                rounded-[6px] border border-[var(--color-border)] border-[0.5px]
                bg-[var(--color-bg-surface)] px-3 pr-8
                text-[13px] text-[var(--color-text-primary)]
                outline-none transition-all duration-150
                focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
              "
            >
              {managerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FilterIcon />
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 self-end text-[13px] text-[var(--color-text-secondary)] sm:self-auto">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={() => { void handleToggleClosed(); }}
            className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
          />
          Показать закрытые
        </label>
      </div>

      {columns.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16">
          <p className="text-[14px] text-[var(--color-text-secondary)]">Нет этапов воронки</p>
        </div>
      ) : (
        <DndContext
          id={DND_CONTEXT_ID}
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="custom-scrollbar flex flex-col gap-4 pb-2 md:flex-row md:overflow-x-auto">
            {columns.map((col) => (
              <PipelineColumn
                key={col.id}
                stageId={col.id}
                title={col.name}
                color={col.color}
                leads={col.leads}
                avgDaysOnStage={col.avgDaysOnStage}
                onCardClick={handleCardClick}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <PipelineCardOverlay
                name={activeLead.name}
                phone={activeLead.phone}
                source={activeLead.source}
                assignedTo={activeLead.assignedTo}
                risk={activeLead.risk}
                closeType={activeLead.closeType}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {toast && (
        <Toast
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
