'use client';

import { useState, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const COLOR_OPTIONS = [
  { value: '', label: 'Без цвета', dotClass: null },
  { value: '#3b82f6', label: 'Синий', dotClass: 'bg-[#3b82f6]' },
  { value: '#8b5cf6', label: 'Фиолетовый', dotClass: 'bg-[#8b5cf6]' },
  { value: '#f59e0b', label: 'Оранжевый', dotClass: 'bg-[#f59e0b]' },
  { value: '#10b981', label: 'Зелёный', dotClass: 'bg-[#10b981]' },
  { value: '#ef4444', label: 'Красный', dotClass: 'bg-[#ef4444]' },
] as const;

export interface AddStageModalProps {
  onConfirm: (name: string, color: string | null) => void;
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

export default function AddStageModal({
  onConfirm,
  onClose,
}: AddStageModalProps): ReactNode {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');

  const selectedColorOption = COLOR_OPTIONS.find((option) => option.value === color);

  function handleConfirm(): void {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    // TODO: создание этапа через API
    console.log('Add stage', { name: trimmedName, color: color || null });
    onConfirm(trimmedName, color || null);
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
          <label
            htmlFor="add-stage-color"
            className="text-[12px] font-normal text-[var(--color-text-secondary)] leading-5"
          >
            Цвет метки
          </label>
          <div className="relative">
            {selectedColorOption?.dotClass ? (
              <span
                className={`
                  pointer-events-none absolute top-1/2 left-3 h-2 w-2 -translate-y-1/2
                  rounded-full ${selectedColorOption.dotClass}
                `}
                aria-hidden="true"
              />
            ) : null}
            <select
              id="add-stage-color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className={`
                h-[36px] w-full appearance-none rounded-[6px]
                border border-[var(--color-border)] border-[0.5px]
                bg-[var(--color-bg-surface)] pr-9
                text-[14px] text-[var(--color-text-primary)]
                outline-none transition-all duration-150
                focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
                ${selectedColorOption?.dotClass ? 'pl-8' : 'pl-3'}
              `}
            >
              {COLOR_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" size="md" onClick={onClose}>
          Отмена
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={!name.trim()}
          onClick={handleConfirm}
        >
          Добавить этап
        </Button>
      </div>
    </Modal>
  );
}
