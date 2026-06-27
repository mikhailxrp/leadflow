'use client';

import { type CSSProperties, useCallback, useRef, useState } from 'react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';

export interface LossReasonItem {
  id: string;
  label: string;
  order: number;
  inUse: boolean;
}

const DND_CONTEXT_ID = 'loss-reasons-list';

function DragHandleIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="7" r="1.25" />
      <circle cx="15" cy="7" r="1.25" />
      <circle cx="9" cy="12" r="1.25" />
      <circle cx="15" cy="12" r="1.25" />
      <circle cx="9" cy="17" r="1.25" />
      <circle cx="15" cy="17" r="1.25" />
    </svg>
  );
}

interface SortableRowProps {
  item: LossReasonItem;
  editingId: string | null;
  editingLabel: string;
  pendingDeleteId: string | null;
  onEditStart: (id: string, label: string) => void;
  onEditChange: (label: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

function SortableRow({
  item,
  editingId,
  editingLabel,
  pendingDeleteId,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isEditing = editingId === item.id;
  const isPendingDelete = pendingDeleteId === item.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex h-[52px] items-center border-b-[0.5px] border-[var(--color-border)] px-4 last:border-0
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <button
        type="button"
        className="flex w-7 flex-shrink-0 cursor-grab items-center justify-center touch-none text-[var(--color-text-tertiary)]"
        aria-label={`Перетащить «${item.label}»`}
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>

      <div className="min-w-0 flex-1 px-2">
        {isEditing ? (
          <input
            autoFocus
            className="w-full bg-transparent text-[14px] text-[var(--color-text-primary)] outline-none border-b border-[#10B981] pb-px"
            value={editingLabel}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onEditSave(); }
              if (e.key === 'Escape') { e.preventDefault(); onEditCancel(); }
            }}
          />
        ) : (
          <button
            type="button"
            className="w-full truncate text-left text-[14px] text-[var(--color-text-primary)] hover:text-[#10B981] transition-colors duration-150"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onEditStart(item.id, item.label)}
          >
            {item.label}
          </button>
        )}
      </div>

      {isPendingDelete ? (
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-[12px] text-[var(--color-text-secondary)]">Удалить?</span>
          <button
            type="button"
            className="text-[12px] font-medium text-[#DC2626] hover:underline"
            onClick={() => onDeleteConfirm(item.id)}
          >
            Да
          </button>
          <button
            type="button"
            className="text-[12px] text-[var(--color-text-secondary)] hover:underline"
            onClick={onDeleteCancel}
          >
            Нет
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={item.inUse}
          title={item.inUse ? 'Причина используется в лидах' : 'Удалить'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDeleteRequest(item.id)}
          className={`
            ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px]
            transition-colors duration-150
            ${item.inUse
              ? 'cursor-not-allowed opacity-30 text-[var(--color-text-secondary)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)] hover:text-[#DC2626]'
            }
          `}
        >
          <Icon icon="lucide:trash-2" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface ToastState {
  title: string;
}

interface LossReasonsListProps {
  initialReasons: LossReasonItem[];
}

export default function LossReasonsList({ initialReasons }: LossReasonsListProps) {
  const [items, setItems] = useState<LossReasonItem[]>(initialReasons);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addingLabel, setAddingLabel] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((title: string) => {
    setToast({ title });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      const snapshot = items;

      setItems(newOrder);

      fetch('/api/loss-reasons/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newOrder.map((item) => item.id) }),
      })
        .then((res) => {
          if (!res.ok) {
            setItems(snapshot);
            showToast('Не удалось сохранить порядок');
          }
        })
        .catch(() => {
          setItems(snapshot);
          showToast('Не удалось сохранить порядок');
        });
    },
    [items, showToast],
  );

  const handleEditStart = useCallback((id: string, label: string) => {
    setEditingId(id);
    setEditingLabel(label);
    setPendingDeleteId(null);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingId) return;

    const trimmed = editingLabel.trim();
    const item = items.find((i) => i.id === editingId);

    setEditingId(null);

    if (!item || !trimmed || trimmed === item.label) return;

    const snapshot = items;
    setItems((prev) => prev.map((i) => (i.id === editingId ? { ...i, label: trimmed } : i)));

    fetch(`/api/loss-reasons/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: trimmed }),
    })
      .then((res) => {
        if (!res.ok) {
          setItems(snapshot);
          showToast('Не удалось сохранить название');
        }
      })
      .catch(() => {
        setItems(snapshot);
        showToast('Не удалось сохранить название');
      });
  }, [editingId, editingLabel, items, showToast]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingLabel('');
  }, []);

  const handleDeleteRequest = useCallback((id: string) => {
    setEditingId(null);
    setPendingDeleteId(id);
  }, []);

  const handleDeleteConfirm = useCallback(
    (id: string) => {
      const snapshot = items;
      setPendingDeleteId(null);
      setItems((prev) => prev.filter((i) => i.id !== id));

      fetch(`/api/loss-reasons/${id}`, { method: 'DELETE' })
        .then(async (res) => {
          if (!res.ok) {
            setItems(snapshot);
            const data = await res.json().catch(() => ({})) as { error?: string };
            if (data.error === 'LOSS_REASON_IN_USE') {
              showToast('Причина используется в лидах и не может быть удалена');
            } else {
              showToast('Не удалось удалить причину');
            }
          }
        })
        .catch(() => {
          setItems(snapshot);
          showToast('Не удалось удалить причину');
        });
    },
    [items, showToast],
  );

  const handleDeleteCancel = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  const handleAddSubmit = useCallback(() => {
    const trimmed = addingLabel.trim();
    setIsAdding(false);
    setAddingLabel('');

    if (!trimmed) return;

    fetch('/api/loss-reasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: trimmed }),
    })
      .then(async (res) => {
        if (res.ok) {
          const created = await res.json() as { id: string; label: string; order: number };
          setItems((prev) => [...prev, { ...created, inUse: false }]);
        } else {
          showToast('Не удалось добавить причину');
        }
      })
      .catch(() => {
        showToast('Не удалось добавить причину');
      });
  }, [addingLabel, showToast]);

  const handleAddKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAddSubmit(); }
      if (e.key === 'Escape') { e.preventDefault(); setIsAdding(false); setAddingLabel(''); }
    },
    [handleAddSubmit],
  );

  return (
    <>
      {items.length === 0 && !isAdding && (
        <p className="px-5 py-3 text-[13px] text-[var(--color-text-secondary)]">
          Причины отказа не добавлены
        </p>
      )}

      {items.length > 0 && (
        <DndContext
          id={DND_CONTEXT_ID}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                editingId={editingId}
                editingLabel={editingLabel}
                pendingDeleteId={pendingDeleteId}
                onEditStart={handleEditStart}
                onEditChange={setEditingLabel}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
                onDeleteRequest={handleDeleteRequest}
                onDeleteConfirm={handleDeleteConfirm}
                onDeleteCancel={handleDeleteCancel}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <div className="px-4 py-3">
        {isAdding ? (
          <div className="flex items-center gap-2">
            <input
              ref={addInputRef}
              autoFocus
              placeholder="Название причины"
              className="
                flex-1 rounded-[6px] border-[0.5px] border-[var(--color-border)]
                bg-[var(--color-bg-surface-2)] px-3 py-1.5
                text-[13px] text-[var(--color-text-primary)]
                placeholder:text-[var(--color-text-tertiary)]
                outline-none focus:border-[#10B981]
              "
              value={addingLabel}
              onChange={(e) => setAddingLabel(e.target.value)}
              onBlur={handleAddSubmit}
              onKeyDown={handleAddKeyDown}
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAddSubmit}
            >
              Добавить
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setIsAdding(false); setAddingLabel(''); }}
            >
              Отмена
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
            className="text-[var(--color-text-secondary)]"
            onClick={() => setIsAdding(true)}
          >
            Добавить причину
          </Button>
        )}
      </div>

      {toast && (
        <Toast
          title={toast.title}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
