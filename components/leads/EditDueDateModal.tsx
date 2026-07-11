'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import IconButton from '@/components/ui/IconButton';
import { toIsoFromLocalParts, toLocalDateTimeParts } from '@/components/tasks/taskConstants';

interface EditDueDateModalProps {
  leadId: string;
  taskId: string;
  currentDueDate: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditDueDateModal({
  leadId,
  taskId,
  currentDueDate,
  onClose,
  onSaved,
}: EditDueDateModalProps): ReactNode {
  const initialParts = toLocalDateTimeParts(currentDueDate);

  const [date, setDate] = useState(initialParts.date);
  const [time, setTime] = useState(initialParts.time);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dueDate = toIsoFromLocalParts(date, time);
  const isValid = Boolean(dueDate);

  async function handleSave(): Promise<void> {
    if (!dueDate) return;

    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate }),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(
            body?.error === 'TASK_NOT_EDITABLE'
              ? 'Задача уже завершена или отменена — обновите страницу'
              : 'Проверьте выбранную дату',
          );
        } else if (res.status === 403) {
          setError('Недостаточно прав для этого действия');
        } else {
          setError('Не удалось сохранить срок');
        }
        return;
      }

      onSaved();
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} dialogClassName="w-[360px] max-w-[360px] rounded-[12px] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-medium text-[var(--color-text-primary)]">
          Изменить срок
        </h2>
        <IconButton
          size="sm"
          onClick={onClose}
          aria-label="Закрыть"
          icon={<span aria-hidden="true">✕</span>}
        />
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[var(--color-text-secondary)]">Срок</span>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="date"
                icon={<Icon icon="tabler:calendar" className="h-4 w-4" />}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Дата"
              />
            </div>
            <div className="flex-1">
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="Время"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-[12px] text-[#EF4444]">{error}</p>}
      </div>

      <div className="mt-6 flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button
          variant="primary"
          disabled={!isValid || saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </Modal>
  );
}
