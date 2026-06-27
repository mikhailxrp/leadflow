'use client';

import { useState, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatLeadsCount } from '@/components/pipeline/stageHelpers';

interface DeleteStageOption {
  id: string;
  name: string;
}

export interface DeleteStageModalProps {
  stageId: string;
  stageName: string;
  leadsCount: number;
  stages: DeleteStageOption[];
  onDeleted: (id: string) => void;
  onClose: () => void;
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

function errorMessage(code: string | undefined): string {
  switch (code) {
    case 'LAST_STAGE':
      return 'Нельзя удалить единственный этап воронки';
    case 'MOVE_TARGET_REQUIRED':
      return 'Выберите этап для переноса лидов';
    default:
      return 'Не удалось удалить этап';
  }
}

export default function DeleteStageModal({
  stageId,
  stageName,
  leadsCount,
  stages,
  onDeleted,
  onClose,
}: DeleteStageModalProps): ReactNode {
  const [targetStageId, setTargetStageId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLeads = leadsCount > 0;
  const confirmDisabled = isSubmitting || (hasLeads && !targetStageId);

  async function handleConfirm(): Promise<void> {
    if (confirmDisabled) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const body = hasLeads && targetStageId ? { moveToStageId: targetStageId } : {};

    try {
      const res = await fetch(`/api/stages/${stageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errorMessage(data.error));
        setIsSubmitting(false);
        return;
      }

      onDeleted(stageId);
    } catch {
      setError('Не удалось удалить этап');
      setIsSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        Удаление этапа
      </h2>
      <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
        {hasLeads
          ? `В этапе «${stageName}» находится ${formatLeadsCount(leadsCount)}. Выберите, куда перенести лиды.`
          : `Этап «${stageName}» пуст и будет удалён.`}
      </p>

      {hasLeads ? (
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
      ) : null}

      {error ? (
        <p className="mt-4 text-[13px] text-[#DC2626]">{error}</p>
      ) : null}

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" size="md" onClick={onClose}>
          Отмена
        </Button>
        <button
          type="button"
          disabled={confirmDisabled}
          onClick={handleConfirm}
          className="
            inline-flex h-[36px] items-center justify-center
            rounded-[20px] px-[14px] text-[13px] font-medium text-white
            transition-all duration-150
            bg-[#ef4444] hover:bg-[#dc2626]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {hasLeads ? 'Удалить и перенести' : 'Удалить'}
        </button>
      </div>
    </Modal>
  );
}
