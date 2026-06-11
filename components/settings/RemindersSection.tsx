'use client';

import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import Toggle from '@/components/settings/Toggle';

/** Минимальная ширина для native `<input type="time">` (HH:MM + иконка часов). */
const TIME_INPUT_WIDTH_CLASS = 'w-[120px]';

const REMINDER_OPTIONS = [
  { value: '15', label: '15 минут' },
  { value: '30', label: '30 минут' },
  { value: '60', label: '1 час' },
  { value: '180', label: '3 часа' },
  { value: '1440', label: '1 день' },
] as const;

interface RemindersState {
  remindBefore: string;
  offHoursEnabled: boolean;
  workHoursStart: string;
  workHoursEnd: string;
  soundEnabled: boolean;
}

const INITIAL_STATE: RemindersState = {
  remindBefore: '15',
  offHoursEnabled: false,
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  soundEnabled: true,
};

interface RemindersSectionProps {
  onDirtyChange: (dirty: boolean) => void;
}

function isStateDirty(state: RemindersState): boolean {
  return JSON.stringify(state) !== JSON.stringify(INITIAL_STATE);
}

function ChevronIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function RemindersSection({ onDirtyChange }: RemindersSectionProps) {
  const [state, setState] = useState<RemindersState>(INITIAL_STATE);

  useEffect(() => {
    onDirtyChange(isStateDirty(state));
  }, [state, onDirtyChange]);

  function update<K extends keyof RemindersState>(key: K, value: RemindersState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsCard icon="tabler:clock" title="Напоминания">
      <SettingsRow label="Напоминать за">
        <div className="relative w-[160px]">
          <select
            value={state.remindBefore}
            onChange={(e) => update('remindBefore', e.target.value)}
            className="
              h-[36px] w-full appearance-none
              rounded-[6px] border-[0.5px] border-[var(--color-border)]
              bg-[var(--color-bg-surface)] px-3 pr-8
              text-[13px] text-[var(--color-text-primary)]
              outline-none transition-all duration-150
              focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
            "
          >
            {REMINDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </div>
      </SettingsRow>

      <SettingsRow label="Напоминания в нерабочее время">
        <Toggle
          checked={state.offHoursEnabled}
          onChange={(checked) => update('offHoursEnabled', checked)}
          aria-label="Напоминания в нерабочее время"
        />
      </SettingsRow>

      <SettingsRow label="Рабочие часы">
        <div className="flex items-center gap-2">
          <div className={TIME_INPUT_WIDTH_CLASS}>
            <Input
              type="time"
              value={state.workHoursStart}
              onChange={(e) => update('workHoursStart', e.target.value)}
              className="tabular-nums"
            />
          </div>
          <span className="text-[14px] text-[var(--color-text-tertiary)]">—</span>
          <div className={TIME_INPUT_WIDTH_CLASS}>
            <Input
              type="time"
              value={state.workHoursEnd}
              onChange={(e) => update('workHoursEnd', e.target.value)}
              className="tabular-nums"
            />
          </div>
        </div>
      </SettingsRow>

      <SettingsRow label="Звуковое уведомление">
        <Toggle
          checked={state.soundEnabled}
          onChange={(checked) => update('soundEnabled', checked)}
          aria-label="Звуковое уведомление"
        />
      </SettingsRow>
    </SettingsCard>
  );
}
