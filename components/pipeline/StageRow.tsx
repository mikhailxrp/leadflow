'use client';

import { Icon } from '@iconify/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  DEFAULT_STAGE_COLOR,
  STAGE_COLOR_PALETTE,
  formatLeadsCount,
} from '@/components/pipeline/stageHelpers';

export interface StageData {
  id: string;
  name: string;
  color: string;
  order: number;
  stageTimeLimitDays: number | null;
  leadsCount: number;
}

interface StageRowProps {
  stage: StageData;
  canDelete: boolean;
  onRename: (id: string, name: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onChangeLimit: (id: string, limit: number | null) => void;
  onDelete: (id: string) => void;
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

export default function StageRow({
  stage,
  canDelete,
  onRename,
  onChangeColor,
  onChangeLimit,
  onDelete,
}: StageRowProps): ReactNode {
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

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(stage.name);
  const [limitDraft, setLimitDraft] = useState(
    stage.stageTimeLimitDays?.toString() ?? '',
  );
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

  // Когда лимит этапа меняется извне (оптимистичное обновление родителя или
  // откат при ошибке), синхронизируем черновик прямо во время рендера —
  // рекомендованный паттерн вместо useEffect.
  const [prevLimit, setPrevLimit] = useState(stage.stageTimeLimitDays);
  if (prevLimit !== stage.stageTimeLimitDays) {
    setPrevLimit(stage.stageTimeLimitDays);
    setLimitDraft(stage.stageTimeLimitDays?.toString() ?? '');
  }

  function commitName(): void {
    setIsEditingName(false);
    const trimmed = nameDraft.trim();

    if (!trimmed || trimmed === stage.name) {
      setNameDraft(stage.name);
      return;
    }

    onRename(stage.id, trimmed);
  }

  function cancelName(): void {
    setIsEditingName(false);
    setNameDraft(stage.name);
  }

  function commitLimit(): void {
    const raw = limitDraft.trim();

    if (raw === '') {
      if (stage.stageTimeLimitDays !== null) {
        onChangeLimit(stage.id, null);
      }
      return;
    }

    const parsed = Number(raw);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setLimitDraft(stage.stageTimeLimitDays?.toString() ?? '');
      return;
    }

    if (parsed !== stage.stageTimeLimitDays) {
      onChangeLimit(stage.id, parsed);
    }
  }

  function handleColorSelect(color: string): void {
    setIsColorMenuOpen(false);
    if (color !== stage.color) {
      onChangeColor(stage.id, color);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`
        flex flex-col gap-2 border-b border-[var(--color-border)] border-[0.5px] px-4 py-3
        last:border-0
        sm:h-[56px] sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:py-0
        ${isDragging ? 'cursor-grabbing opacity-50' : ''}
      `}
    >
      {/* Ручка + цвет + название */}
      <div className="flex min-w-0 items-center sm:flex-1">
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

      <div className="relative mr-3 flex-shrink-0">
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110"
          aria-label={`Изменить цвет этапа «${stage.name}»`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setIsColorMenuOpen((open) => !open)}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color || DEFAULT_STAGE_COLOR }}
            aria-hidden="true"
          />
        </button>

        {isColorMenuOpen ? (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden="true"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setIsColorMenuOpen(false)}
            />
            <div
              className="
                absolute left-0 top-7 z-50 flex gap-1.5 rounded-[8px]
                border border-[var(--color-border)] border-[0.5px]
                bg-[var(--color-bg-surface)] p-2 shadow-lg
              "
              onPointerDown={(event) => event.stopPropagation()}
            >
              {STAGE_COLOR_PALETTE.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => handleColorSelect(option.value)}
                  className={`
                    h-5 w-5 flex-shrink-0 rounded-full transition-transform duration-150 hover:scale-110
                    ${stage.color === option.value ? 'ring-2 ring-[#10B981] ring-offset-1 ring-offset-[var(--color-bg-surface)]' : ''}
                  `}
                  style={{ backgroundColor: option.value }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {isEditingName ? (
          <input
            autoFocus
            className="
              w-full bg-transparent text-[14px] font-medium text-[var(--color-text-primary)]
              outline-none border-b border-[#10B981] pb-px
            "
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitName();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                cancelName();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="
              w-full truncate text-left text-[14px] font-medium text-[var(--color-text-primary)]
              transition-colors duration-150 hover:text-[#10B981]
            "
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              setNameDraft(stage.name);
              setIsEditingName(true);
            }}
          >
            {stage.name}
          </button>
        )}
      </div>
      </div>

      {/* Лимит + счётчик + удалить */}
      <div className="flex items-center gap-3 sm:gap-0">
        <div className="flex flex-shrink-0 items-center gap-1.5 sm:ml-4">
        <input
          type="text"
          inputMode="numeric"
          placeholder="∞"
          title="Допустимое время на этапе (дней). Пусто — по умолчанию компании."
          value={limitDraft}
          onChange={(event) => setLimitDraft(event.target.value)}
          onBlur={commitLimit}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitLimit();
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setLimitDraft(stage.stageTimeLimitDays?.toString() ?? '');
              event.currentTarget.blur();
            }
          }}
          className="
            h-7 w-14 rounded-[6px] border border-[var(--color-border)] border-[0.5px]
            bg-[var(--color-bg-surface)] px-2 text-center text-[13px] text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-tertiary)]
            outline-none transition-all duration-150
            focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
          "
        />
        <span className="text-[12px] text-[var(--color-text-tertiary)]">дн.</span>
        </div>

        <span className="ml-auto flex-shrink-0 text-right text-[13px] text-[var(--color-text-tertiary)] sm:ml-4 sm:w-[72px]">
          {formatLeadsCount(stage.leadsCount)}
        </span>

        <button
        type="button"
        disabled={!canDelete}
        title={canDelete ? 'Удалить этап' : 'Нельзя удалить единственный этап'}
        className={`
          flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px]
          transition-colors duration-150 sm:ml-3
          ${
            canDelete
              ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)] hover:text-[#DC2626]'
              : 'cursor-not-allowed opacity-30 text-[var(--color-text-secondary)]'
          }
        `}
        aria-label={`Удалить этап «${stage.name}»`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onDelete(stage.id)}
      >
        <Icon icon="lucide:trash-2" className="h-4 w-4" />
      </button>
      </div>
    </div>
  );
}
