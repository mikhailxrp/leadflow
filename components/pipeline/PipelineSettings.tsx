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
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import AddStageModal from '@/components/pipeline/AddStageModal';
import DeleteStageModal from '@/components/pipeline/DeleteStageModal';
import StageRow, { type StageData } from '@/components/pipeline/StageRow';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const DND_CONTEXT_ID = 'pipeline-settings-stages';

const INITIAL_STAGES: StageData[] = [
  { id: 'new', name: 'Новый лид', leadCountLabel: '42 лида', leadsCount: 42 },
  {
    id: 'contact',
    name: 'Первичный контакт',
    leadCountLabel: '28 лидов',
    leadsCount: 28,
    dotColorClass: 'bg-[#8b5cf6]',
  },
  {
    id: 'in-progress',
    name: 'В работе',
    leadCountLabel: '31 лид',
    leadsCount: 31,
  },
  {
    id: 'warm',
    name: 'Тёплый клиент',
    leadCountLabel: '18 лидов',
    leadsCount: 18,
    dotColorClass: 'bg-[#10b981]',
  },
  { id: 'deal', name: 'Сделка', leadCountLabel: '34 лида', leadsCount: 34 },
];

interface PipelineSettingsContextValue {
  stages: StageData[];
  setStages: Dispatch<SetStateAction<StageData[]>>;
  hasChanges: boolean;
  setHasChanges: Dispatch<SetStateAction<boolean>>;
  handleSave: () => void;
}

const PipelineSettingsContext = createContext<PipelineSettingsContextValue | null>(
  null,
);

function usePipelineSettings(): PipelineSettingsContextValue {
  const context = useContext(PipelineSettingsContext);

  if (!context) {
    throw new Error('PipelineSettings components must be used within PipelineSettings');
  }

  return context;
}

function isSameOrder(current: StageData[], initial: StageData[]): boolean {
  return current.every((stage, index) => stage.id === initial[index]?.id);
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

export function SaveOrderButton(): ReactNode {
  const { hasChanges, handleSave } = usePipelineSettings();

  return (
    <Button
      type="button"
      variant="primary"
      size="md"
      disabled={!hasChanges}
      onClick={handleSave}
    >
      Сохранить порядок
    </Button>
  );
}

export function PipelineSettingsStages(): ReactNode {
  const { stages, setStages, setHasChanges } = usePipelineSettings();
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const deleteStage = deleteStageId
    ? stages.find((stage) => stage.id === deleteStageId) ?? null
    : null;

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

      setStages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const nextOrder = arrayMove(items, oldIndex, newIndex);
        setHasChanges(!isSameOrder(nextOrder, INITIAL_STAGES));
        return nextOrder;
      });
    },
    [setStages, setHasChanges],
  );

  const handleAddStage = useCallback((): void => {
    setIsAddModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback((targetStageId: string): void => {
    void targetStageId;
    setDeleteStageId(null);
  }, []);

  const handleAddConfirm = useCallback((name: string, color: string | null): void => {
    void name;
    void color;
    setIsAddModalOpen(false);
  }, []);

  return (
    <>
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
                onDelete={setDeleteStageId}
              />
            ))}
          </SortableContext>
        </Card>
      </DndContext>

      <Button
        type="button"
        variant="ghost"
        size="md"
        icon={<PlusIcon />}
        className="mt-4 text-[var(--color-text-secondary)]"
        onClick={handleAddStage}
      >
        Добавить этап
      </Button>

      {deleteStage ? (
        <DeleteStageModal
          stageName={deleteStage.name}
          leadsCount={deleteStage.leadsCount}
          stages={stages
            .filter((stage) => stage.id !== deleteStage.id)
            .map((stage) => ({ id: stage.id, name: stage.name }))}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteStageId(null)}
        />
      ) : null}

      {isAddModalOpen ? (
        <AddStageModal
          onConfirm={handleAddConfirm}
          onClose={() => setIsAddModalOpen(false)}
        />
      ) : null}
    </>
  );
}

interface PipelineSettingsProps {
  children: ReactNode;
}

export default function PipelineSettings({ children }: PipelineSettingsProps): ReactNode {
  const [stages, setStages] = useState<StageData[]>(INITIAL_STAGES);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = useCallback((): void => {
    // TODO: сохранение порядка через API
    console.log(stages.map((stage) => stage.id));
    setHasChanges(false);
  }, [stages]);

  const contextValue = useMemo(
    () => ({
      stages,
      setStages,
      hasChanges,
      setHasChanges,
      handleSave,
    }),
    [stages, hasChanges, handleSave],
  );

  return (
    <PipelineSettingsContext.Provider value={contextValue}>
      {children}
    </PipelineSettingsContext.Provider>
  );
}
