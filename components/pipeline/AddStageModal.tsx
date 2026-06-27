'use client';

import { useState, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { type StageData } from '@/components/pipeline/StageRow';
import {
  DEFAULT_STAGE_COLOR,
  STAGE_COLOR_PALETTE,
} from '@/components/pipeline/stageHelpers';

export interface AddStageModalProps {
  onCreated: (stage: StageData) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export default function AddStageModal({
  onCreated,
  onError,
  onClose,
}: AddStageModalProps): ReactNode {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_STAGE_COLOR);
  const [limit, setLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) {
      return;
    }

    const body: { name: string; color: string; stageTimeLimitDays?: number } = {
      name: trimmedName,
      color,
    };

    const rawLimit = limit.trim();
    if (rawLimit !== '') {
      const parsed = Number(rawLimit);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        onError('Допустимое время должно быть целым числом больше 0');
        return;
      }
      body.stageTimeLimitDays = parsed;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        onError('Не удалось добавить этап');
        setIsSubmitting(false);
        return;
      }

      const created = (await res.json()) as StageData;
      onCreated(created);
    } catch {
      onError('Не удалось добавить этап');
      setIsSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        Добавить этап
      </h2>
      <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
        Новый этап появится в конце воронки.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Название этапа"
          placeholder="Например: Переговоры"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal text-[var(--color-text-secondary)] leading-5">
            Цвет метки
          </span>
          <div className="flex gap-2">
            {STAGE_COLOR_PALETTE.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.label}
                title={option.label}
                onClick={() => setColor(option.value)}
                className={`
                  h-6 w-6 flex-shrink-0 rounded-full transition-transform duration-150 hover:scale-110
                  ${color === option.value ? 'ring-2 ring-[#10B981] ring-offset-2 ring-offset-[var(--color-bg-surface)]' : ''}
                `}
                style={{ backgroundColor: option.value }}
              />
            ))}
          </div>
        </div>

        <Input
          label="Допустимое время на этапе (дней)"
          type="text"
          inputMode="numeric"
          placeholder="По умолчанию компании"
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" size="md" onClick={onClose}>
          Отмена
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={!name.trim() || isSubmitting}
          onClick={handleConfirm}
        >
          Добавить этап
        </Button>
      </div>
    </Modal>
  );
}
