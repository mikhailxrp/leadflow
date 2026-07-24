'use client';

import { useState, type ReactNode } from 'react';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import Toggle from '@/components/settings/Toggle';
import Toast from '@/components/ui/Toast';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const DEFAULT_WORK_HOURS: WorkHoursValue = { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] };

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
];

export interface WorkHoursValue {
  start: string;
  end: string;
  days: number[];
}

interface WorkHoursFormProps {
  initialWorkHoursOnly: boolean;
  initialWorkHours: WorkHoursValue | null;
}

async function patchWorkHoursOnly(value: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactionNorms: { workHoursOnly: value } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function saveWorkHours(next: WorkHoursValue): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workHours: next }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function WorkHoursForm({ initialWorkHoursOnly, initialWorkHours }: WorkHoursFormProps): ReactNode {
  const [workHoursOnly, setWorkHoursOnly] = useState(initialWorkHoursOnly);
  const [workHours, setWorkHours] = useState<WorkHoursValue>(initialWorkHours ?? DEFAULT_WORK_HOURS);
  const [hasWorkHours, setHasWorkHours] = useState(initialWorkHours !== null);
  const [startDraft, setStartDraft] = useState(workHours.start);
  const [endDraft, setEndDraft] = useState(workHours.end);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showError(message: string): void {
    setToast(message);
  }

  async function handleToggle(checked: boolean): Promise<void> {
    if (saving) return;

    const previous = workHoursOnly;
    setWorkHoursOnly(checked);
    setSaving(true);

    const ok = await patchWorkHoursOnly(checked);

    if (!ok) {
      setWorkHoursOnly(previous);
      setSaving(false);
      showError('Не удалось сохранить настройку');
      return;
    }

    // Тумблер включён впервые, а расписание ещё ни разу не сохранялось — без этого
    // гейт молча не действует (сервер получает workHours: undefined).
    if (checked && !hasWorkHours) {
      const savedDefaults = await saveWorkHours(workHours);
      if (savedDefaults) {
        setHasWorkHours(true);
      } else {
        showError('Настройка включена, но не удалось сохранить расписание по умолчанию');
      }
    }

    setSaving(false);
  }

  async function commitStart(): Promise<void> {
    const trimmed = startDraft.trim();

    if (!TIME_REGEX.test(trimmed) || trimmed === workHours.start) {
      setStartDraft(workHours.start);
      return;
    }

    const next: WorkHoursValue = { ...workHours, start: trimmed };
    setSaving(true);
    const ok = await saveWorkHours(next);
    setSaving(false);

    if (ok) {
      setWorkHours(next);
      setHasWorkHours(true);
      setStartDraft(trimmed);
    } else {
      setStartDraft(workHours.start);
      showError('Не удалось сохранить рабочее время');
    }
  }

  async function commitEnd(): Promise<void> {
    const trimmed = endDraft.trim();

    if (!TIME_REGEX.test(trimmed) || trimmed === workHours.end) {
      setEndDraft(workHours.end);
      return;
    }

    const next: WorkHoursValue = { ...workHours, end: trimmed };
    setSaving(true);
    const ok = await saveWorkHours(next);
    setSaving(false);

    if (ok) {
      setWorkHours(next);
      setHasWorkHours(true);
      setEndDraft(trimmed);
    } else {
      setEndDraft(workHours.end);
      showError('Не удалось сохранить рабочее время');
    }
  }

  async function toggleDay(day: number): Promise<void> {
    if (saving) return;

    const isSelected = workHours.days.includes(day);
    const nextDays = isSelected
      ? workHours.days.filter((d) => d !== day)
      : [...workHours.days, day].sort((a, b) => a - b);

    if (nextDays.length === 0) {
      showError('Нужен хотя бы один рабочий день');
      return;
    }

    const next: WorkHoursValue = { ...workHours, days: nextDays };
    setSaving(true);
    const ok = await saveWorkHours(next);
    setSaving(false);

    if (ok) {
      setWorkHours(next);
      setHasWorkHours(true);
    } else {
      showError('Не удалось сохранить рабочие дни');
    }
  }

  return (
    <SettingsCard icon="tabler:clock" title="Рабочее время">
      <SettingsRow label="Учитывать только рабочее время в нормативе реакции">
        <Toggle
          checked={workHoursOnly}
          disabled={saving}
          onChange={handleToggle}
          aria-label="Учитывать только рабочее время"
        />
      </SettingsRow>

      {workHoursOnly && !hasWorkHours && (
        <p className="border-b-[0.5px] border-[var(--color-border)] px-5 py-2 text-[12px] text-[#D97706]">
          Расписание не сохранено — норматив пока считается без учёта рабочего времени. Проверьте время и дни ниже.
        </p>
      )}

      <SettingsRow label="Начало дня">
        <input
          type="text"
          placeholder="09:00"
          disabled={saving}
          value={startDraft}
          onChange={(e) => setStartDraft(e.target.value)}
          onBlur={commitStart}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setStartDraft(workHours.start);
              e.currentTarget.blur();
            }
          }}
          className="
            h-8 w-20 rounded-[6px] border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)] px-2 text-center text-[13px] text-[var(--color-text-primary)]
            outline-none transition-all duration-150
            focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        />
      </SettingsRow>

      <SettingsRow label="Конец дня">
        <input
          type="text"
          placeholder="18:00"
          disabled={saving}
          value={endDraft}
          onChange={(e) => setEndDraft(e.target.value)}
          onBlur={commitEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setEndDraft(workHours.end);
              e.currentTarget.blur();
            }
          }}
          className="
            h-8 w-20 rounded-[6px] border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)] px-2 text-center text-[13px] text-[var(--color-text-primary)]
            outline-none transition-all duration-150
            focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        />
      </SettingsRow>

      <SettingsRow label="Рабочие дни">
        <div className="flex flex-wrap items-center gap-1.5">
          {DAY_LABELS.map((day) => {
            const selected = workHours.days.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                disabled={saving}
                aria-pressed={selected}
                onClick={() => toggleDay(day.value)}
                className={`
                  flex h-7 w-9 items-center justify-center rounded-[6px] text-[12px] font-medium
                  transition-colors duration-150
                  disabled:cursor-not-allowed disabled:opacity-50
                  ${
                    selected
                      ? 'bg-[#10B981] text-white'
                      : 'border-[0.5px] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]'
                  }
                `}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </SettingsRow>

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </SettingsCard>
  );
}
