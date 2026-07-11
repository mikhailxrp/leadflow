'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import IconButton from '@/components/ui/IconButton';
import { createReminderSchema } from '@/lib/validations/reminders';
import type { ReminderChannelName, ReminderData } from '@/components/reminders/ReminderItem';

const CHANNEL_OPTIONS: { value: ReminderChannelName; label: string }[] = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Локальная дата/время (не UTC) — для предзаполнения `<input type="date">`/`<input type="time">`. */
function toLocalDateTimeParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** `date`/`time` — локальные значения из нативных инпутов; строка без смещения парсится JS как local time. */
function toIsoFromLocalParts(date: string, time: string): string | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface AddReminderModalProps {
  leadId: string;
  telegramConnected: boolean;
  initial?: ReminderData;
  onClose: () => void;
  onSaved: (reminder: ReminderData) => void;
}

export default function AddReminderModal({
  leadId,
  telegramConnected,
  initial,
  onClose,
  onSaved,
}: AddReminderModalProps): ReactNode {
  const isEdit = initial !== undefined;
  const initialParts = initial ? toLocalDateTimeParts(initial.remindAt) : null;

  const [text, setText] = useState(initial?.text ?? '');
  const [date, setDate] = useState(initialParts?.date ?? '');
  const [time, setTime] = useState(initialParts?.time ?? '');
  const [channels, setChannels] = useState<ReminderChannelName[]>(initial?.channels ?? []);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleChannel(channel: ReminderChannelName): void {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  async function handleSave(): Promise<void> {
    setFieldError(null);
    setFormError(null);

    const remindAt = toIsoFromLocalParts(date, time);
    const parsed = createReminderSchema.safeParse({
      text: text.trim(),
      remindAt: remindAt ?? '',
      channels,
    });

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Проверьте заполненные поля');
      return;
    }

    setSaving(true);

    try {
      const url = isEdit
        ? `/api/leads/${leadId}/reminders/${initial.id}`
        : `/api/leads/${leadId}/reminders`;

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          setFormError('Дата должна быть в будущем (минимум 5 минут) — обновите время и попробуйте снова');
        } else {
          setFormError('Не удалось сохранить напоминание');
        }
        return;
      }

      const saved = (await res.json()) as ReminderData;
      onSaved(saved);
      onClose();
    } catch {
      setFormError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  const isValid = text.trim().length > 0 && date.length > 0 && time.length > 0 && channels.length > 0;
  const showTelegramWarning = channels.includes('telegram') && !telegramConnected;

  return (
    <Modal onClose={onClose} dialogClassName="w-[480px] max-w-[480px] rounded-[12px] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          {isEdit ? 'Изменить напоминание' : 'Новое напоминание'}
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
          <label htmlFor="reminder-text" className="text-[12px] text-[var(--color-text-secondary)]">
            Текст напоминания <span className="text-[#EF4444]">*</span>
          </label>
          <textarea
            id="reminder-text"
            rows={2}
            placeholder="О чём напомнить?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            className="
              w-full resize-none rounded-[6px]
              border border-[var(--color-border)] border-[0.5px] p-3
              text-[14px] text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              outline-none transition-all duration-150
              focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
            "
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            Дата и время <span className="text-[#EF4444]">*</span>
          </span>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="date"
                min={todayLocalDate()}
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

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            Каналы <span className="text-[#EF4444]">*</span>
          </span>
          <div className="flex gap-4">
            {CHANNEL_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-[13px] text-[var(--color-text-primary)]"
              >
                <input
                  type="checkbox"
                  checked={channels.includes(option.value)}
                  onChange={() => toggleChannel(option.value)}
                  className="h-4 w-4 rounded-[4px] accent-[var(--color-primary)]"
                />
                {option.label}
              </label>
            ))}
          </div>
          {showTelegramWarning && (
            <p className="text-[12px] text-[var(--color-warning)]">
              Telegram не привязан. Напоминание придёт только на Email.
            </p>
          )}
        </div>

        {(fieldError || formError) && (
          <p className="text-[12px] text-[#EF4444]">{fieldError ?? formError}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" disabled={!isValid || saving} onClick={handleSave}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </Modal>
  );
}
