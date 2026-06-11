'use client';

import { useState, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface DeleteStageOption {
  id: string;
  name: string;
}

export interface DeleteStageModalProps {
  stageName: string;
  leadsCount: number;
  stages: DeleteStageOption[];
  onConfirm: (targetStageId: string) => void;
  onClose: () => void;
}

function formatLeadsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} лид`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} лида`;
  }

  return `${count} лидов`;
}

function ChevronDownIcon(): ReactNode {
  return (
    <svg
      className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function DeleteStageModal({
  stageName,
  leadsCount,
  stages,
  onConfirm,
  onClose,
}: DeleteStageModalProps): ReactNode {
  const [targetStageId, setTargetStageId] = useState('');

  function handleConfirm(): void {
    if (!targetStageId) {
      return;
    }

    // TODO: удаление этапа и перенос лидов через API
    console.log('Delete stage', { stageName, targetStageId });
    onConfirm(targetStageId);
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        Удаление этапа
      </h2>
      <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
        В этапе «{stageName}» находится {formatLeadsCount(leadsCount)}.
      </p>

      <div className="mt-5 flex flex-col gap-1.5">
        <label
          htmlFor="delete-stage-target"
          className="text-[12px] text-[var(--color-text-secondary)]"
        >
          Куда перенести лиды?
        </label>
        <div className="relative">
          <select
            id="delete-stage-target"
            value={targetStageId}
            onChange={(event) => setTargetStageId(event.target.value)}
            className="
              h-[36px] w-full appearance-none rounded-[6px]
              border border-[var(--color-border)] border-[0.5px]
              bg-[var(--color-bg-surface)] px-3 pr-9
              text-[14px] text-[var(--color-text-primary)]
              outline-none transition-all duration-150
              focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
              invalid:text-[var(--color-text-tertiary)]
            "
          >
            <option value="" disabled>
              Выберите этап...
            </option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" size="md" onClick={onClose}>
          Отмена
        </Button>
        <button
          type="button"
          disabled={!targetStageId}
          onClick={handleConfirm}
          className="
            inline-flex h-[36px] items-center justify-center
            rounded-[20px] px-[14px] text-[13px] font-medium text-white
            transition-all duration-150
            bg-[#ef4444] hover:bg-[#dc2626]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          Удалить и перенести
        </button>
      </div>
    </Modal>
  );
}
