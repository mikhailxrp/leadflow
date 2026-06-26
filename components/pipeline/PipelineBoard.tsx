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
import { PipelineCardOverlay } from '@/components/pipeline/PipelineCard';
import PipelineColumn, { type PipelineLead } from '@/components/pipeline/PipelineColumn';

const DRAG_ACTIVATION_DISTANCE_PX = 8;
const DND_CONTEXT_ID = 'pipeline-board';

interface PipelineStage {
  id: string;
  title: string;
  accentClass: string;
  leads: PipelineLead[];
}

function findLead(stages: PipelineStage[], leadId: string): PipelineLead | undefined {
  return stages.flatMap((stage) => stage.leads).find((lead) => lead.id === leadId);
}

function findStageIdByLeadId(stages: PipelineStage[], leadId: string): string | undefined {
  return stages.find((stage) => stage.leads.some((lead) => lead.id === leadId))?.id;
}

function resolveOverStageId(stages: PipelineStage[], overId: string): string | undefined {
  const stageByLead = findStageIdByLeadId(stages, overId);
  if (stageByLead) {
    return stageByLead;
  }

  if (stages.some((stage) => stage.id === overId)) {
    return overId;
  }

  return undefined;
}

function moveLead(
  stages: PipelineStage[],
  activeId: string,
  overId: string,
): PipelineStage[] {
  const activeLead = findLead(stages, activeId);
  const activeStageId = findStageIdByLeadId(stages, activeId);
  const overStageId = resolveOverStageId(stages, overId);

  if (!activeLead || !activeStageId || !overStageId) {
    return stages;
  }

  if (activeStageId === overStageId) {
    return stages.map((stage) => {
      if (stage.id !== activeStageId) {
        return stage;
      }

      const oldIndex = stage.leads.findIndex((lead) => lead.id === activeId);
      const newIndex = stage.leads.findIndex((lead) => lead.id === overId);

      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return stage;
      }

      return {
        ...stage,
        leads: arrayMove(stage.leads, oldIndex, newIndex),
      };
    });
  }

  return stages.map((stage) => {
    if (stage.id === activeStageId) {
      return {
        ...stage,
        leads: stage.leads.filter((lead) => lead.id !== activeId),
      };
    }

    if (stage.id === overStageId) {
      const leadsWithoutActive = stage.leads.filter((lead) => lead.id !== activeId);
      const overIndex = leadsWithoutActive.findIndex((lead) => lead.id === overId);
      const nextLeads = [...leadsWithoutActive];

      if (overId === overStageId || overIndex < 0) {
        nextLeads.push(activeLead);
      } else {
        nextLeads.splice(overIndex, 0, activeLead);
      }

      return {
        ...stage,
        leads: nextLeads,
      };
    }

    return stage;
  });
}

export default function PipelineBoard(): ReactNode {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [activeLead, setActiveLead] = useState<PipelineLead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    const lead = findLead(stages, String(event.active.id));
    setActiveLead(lead ?? null);
  }, [stages]);

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    setStages((currentStages) => {
      const nextStages = moveLead(currentStages, activeId, overId);
      const prevStageId = findStageIdByLeadId(currentStages, activeId);
      const nextStageId = findStageIdByLeadId(nextStages, activeId);

      if (prevStageId && nextStageId && prevStageId !== nextStageId) {
        // TODO: сохранить новый этап лида через API
        console.log(`Lead ${activeId}: ${prevStageId} → ${nextStageId}`);
      }

      return nextStages;
    });
  }, []);

  const handleDragCancel = useCallback((): void => {
    setActiveLead(null);
  }, []);

  const handleCardClick = useCallback((): void => {
    // TODO: Phase 9 — navigate to /leads/[id]
  }, []);

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16">
        <p className="text-[14px] text-[var(--color-text-secondary)]">Этапы воронки появятся в Phase 8/9</p>
      </div>
    );
  }

  return (
    <DndContext
      id={DND_CONTEXT_ID}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="custom-scrollbar flex flex-row gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stageId={stage.id}
            title={stage.title}
            accentClass={stage.accentClass}
            leads={stage.leads}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <PipelineCardOverlay
            name={activeLead.name}
            phone={activeLead.phone}
            tags={activeLead.tags}
            manager={activeLead.manager}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
