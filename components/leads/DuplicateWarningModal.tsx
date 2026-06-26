'use client';

import { Icon } from '@iconify/react';
import { type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export interface PossibleDuplicatePreview {
  id: string;
  name: string | null;
  matchType: 'PHONE' | 'EMAIL';
}

export interface DuplicateWarningModalProps {
  duplicates: PossibleDuplicatePreview[];
  loading: boolean;
  onConfirm: () => void;
  onOpenExisting: (leadId: string) => void;
  onClose: () => void;
}

const MATCH_TYPE_LABELS: Record<PossibleDuplicatePreview['matchType'], string> = {
  PHONE: 'Телефон',
  EMAIL: 'Email',
};

export default function DuplicateWarningModal({
  duplicates,
  loading,
  onConfirm,
  onOpenExisting,
  onClose,
}: DuplicateWarningModalProps): ReactNode {
  return (
    <Modal onClose={onClose} dialogClassName="max-w-[480px]">
      <div className="flex items-start gap-3">
        <div
          className="
            flex h-10 w-10 shrink-0 items-center justify-center rounded-full
            bg-[#FEF3C7] text-[#D97706]
          "
          aria-hidden="true"
        >
          <Icon icon="tabler:alert-triangle" className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
              Похоже, такой лид уже есть
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="
                shrink-0 cursor-pointer rounded-md p-1
                text-[var(--color-text-tertiary)] transition-colors duration-150
                hover:bg-[var(--color-bg-surface-2)] hover:text-[var(--color-text-secondary)]
              "
              aria-label="Закрыть"
            >
              <Icon icon="tabler:x" className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
            Найдены совпадения по контактным данным. Вы можете открыть существующий лид или
            создать новый.
          </p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2" aria-label="Найденные совпадения">
        {duplicates.map((duplicate) => (
          <li
            key={duplicate.id}
            className="
              flex items-center justify-between gap-3 rounded-lg
              border-[0.5px] border-[var(--color-border)]
              bg-[var(--color-bg-surface-2)] px-4 py-3
            "
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                {duplicate.name?.trim() || 'Без имени'}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
                Совпадение: {MATCH_TYPE_LABELS[duplicate.matchType]}
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenExisting(duplicate.id)}
              className="shrink-0 cursor-pointer text-[13px] text-[var(--color-primary)] transition-colors duration-150 hover:text-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Открыть
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          size="md"
          type="button"
          onClick={onClose}
        >
          Закрыть
        </Button>
        <Button
          variant="primary"
          size="md"
          type="button"
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? 'Создание…' : 'Всё равно создать'}
        </Button>
      </div>
    </Modal>
  );
}
