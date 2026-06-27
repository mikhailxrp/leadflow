'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCallback, useState, type ReactNode } from 'react';
import AddStageModal from '@/components/pipeline/AddStageModal';
import DeleteStageModal from '@/components/pipeline/DeleteStageModal';
import StageRow, { type StageData } from '@/components/pipeline/StageRow';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';

const DND_CONTEXT_ID = 'pipeline-settings-stages';

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

interface PipelineSettingsProps {
  initialStages: StageData[];
}

export default function PipelineSettings({
  initialStages,
}: PipelineSettingsProps): ReactNode {
  const [stages, setStages] = useState<StageData[]>(initialStages);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = stages.findIndex((stage) => stage.id === active.id);
      const newIndex = stages.findIndex((stage) => stage.id === over.id);
      const reordered = arrayMove(stages, oldIndex, newIndex);
      const snapshot = stages;

      setStages(reordered);

      fetch('/api/stages/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((stage) => stage.id) }),
      })
        .then((res) => {
          if (!res.ok) {
            setStages(snapshot);
            showToast('Не удалось сохранить порядок');
          }
        })
        .catch(() => {
          setStages(snapshot);
          showToast('Не удалось сохранить порядок');
        });
    },
    [stages, showToast],
  );

  const patchStage = useCallback(
    (
      id: string,
      patch: Partial<Pick<StageData, 'name' | 'color' | 'stageTimeLimitDays'>>,
      errorMessage: string,
    ): void => {
      const snapshot = stages;
      setStages((prev) =>
        prev.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
      );

      fetch(`/api/stages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
        .then((res) => {
          if (!res.ok) {
            setStages(snapshot);
            showToast(errorMessage);
          }
        })
        .catch(() => {
          setStages(snapshot);
          showToast(errorMessage);
        });
    },
    [stages, showToast],
  );

  const handleRename = useCallback(
    (id: string, name: string): void => {
      patchStage(id, { name }, 'Не удалось сохранить название');
    },
    [patchStage],
  );

  const handleChangeColor = useCallback(
    (id: string, color: string): void => {
      patchStage(id, { color }, 'Не удалось сохранить цвет');
    },
    [patchStage],
  );

  const handleChangeLimit = useCallback(
    (id: string, limit: number | null): void => {
      patchStage(
        id,
        { stageTimeLimitDays: limit },
        'Не удалось сохранить допустимое время',
      );
    },
    [patchStage],
  );

  const handleCreated = useCallback((stage: StageData): void => {
    setStages((prev) => [...prev, stage]);
    setIsAddModalOpen(false);
  }, []);

  const handleDeleted = useCallback((id: string): void => {
    setStages((prev) => prev.filter((stage) => stage.id !== id));
    setDeleteStageId(null);
  }, []);

  const deleteStage = deleteStageId
    ? stages.find((stage) => stage.id === deleteStageId) ?? null
    : null;

  return (
    <>
      {stages.length === 0 ? (
        <Card padding="lg">
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Этапы воронки ещё не созданы. Добавьте первый этап.
          </p>
        </Card>
      ) : (
        <DndContext
          id={DND_CONTEXT_ID}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Card padding="none" className="overflow-hidden">
            <SortableContext
              items={stages.map((stage) => stage.id)}
              strategy={verticalListSortingStrategy}
            >
              {stages.map((stage) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  canDelete={stages.length > 1}
                  onRename={handleRename}
                  onChangeColor={handleChangeColor}
                  onChangeLimit={handleChangeLimit}
                  onDelete={setDeleteStageId}
                />
              ))}
            </SortableContext>
          </Card>
        </DndContext>
      )}

      <Button
        type="button"
        variant="ghost"
        size="md"
        icon={<PlusIcon />}
        className="mt-4 text-[var(--color-text-secondary)]"
        onClick={() => setIsAddModalOpen(true)}
      >
        Добавить этап
      </Button>

      {deleteStage ? (
        <DeleteStageModal
          stageId={deleteStage.id}
          stageName={deleteStage.name}
          leadsCount={deleteStage.leadsCount}
          stages={stages
            .filter((stage) => stage.id !== deleteStage.id)
            .map((stage) => ({ id: stage.id, name: stage.name }))}
          onDeleted={handleDeleted}
          onClose={() => setDeleteStageId(null)}
        />
      ) : null}

      {isAddModalOpen ? (
        <AddStageModal
          onCreated={handleCreated}
          onError={showToast}
          onClose={() => setIsAddModalOpen(false)}
        />
      ) : null}

      {toast ? <Toast title={toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
