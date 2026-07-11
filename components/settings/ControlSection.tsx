'use client';

import { useState, type ReactNode } from 'react';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import Toggle from '@/components/settings/Toggle';
import Toast from '@/components/ui/Toast';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ControlFields {
  controlEnabled: boolean;
  defaultMinutes: number;
  reminderBeforePercent: number;
  escalateAfterPercent: number;
  stageStuckDaysDefault: number;
  stuckCheckTime: string;
  sourceHealthThresholdHours: number;
}

interface ControlSectionProps {
  initialFields: ControlFields;
}

async function patchSettings(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface NumberRowProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max?: number;
  disabled: boolean;
  onCommit: (next: number) => Promise<boolean>;
  onError: () => void;
}

function NumberRow({ label, unit, value, min, max, disabled, onCommit, onError }: NumberRowProps): ReactNode {
  const [draft, setDraft] = useState(String(value));

  async function commit(): Promise<void> {
    const raw = draft.trim();
    const parsed = Number(raw);

    if (raw === '' || !Number.isInteger(parsed) || parsed < min || (max !== undefined && parsed > max)) {
      setDraft(String(value));
      return;
    }

    if (parsed === value) {
      setDraft(String(value));
      return;
    }

    const ok = await onCommit(parsed);
    if (ok) {
      setDraft(String(parsed));
    } else {
      setDraft(String(value));
      onError();
    }
  }

  return (
    <SettingsRow label={label}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(String(value));
              e.currentTarget.blur();
            }
          }}
          className="
            h-8 w-20 rounded-[6px] border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)] px-2 text-right text-[13px] text-[var(--color-text-primary)]
            outline-none transition-all duration-150
            focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        />
        <span className="text-[12px] text-[var(--color-text-tertiary)]">{unit}</span>
      </div>
    </SettingsRow>
  );
}

interface TimeRowProps {
  label: string;
  value: string;
  disabled: boolean;
  onCommit: (next: string) => Promise<boolean>;
  onError: () => void;
}

function TimeRow({ label, value, disabled, onCommit, onError }: TimeRowProps): ReactNode {
  const [draft, setDraft] = useState(value);

  async function commit(): Promise<void> {
    const trimmed = draft.trim();

    if (!TIME_REGEX.test(trimmed)) {
      setDraft(value);
      return;
    }

    if (trimmed === value) {
      setDraft(value);
      return;
    }

    const ok = await onCommit(trimmed);
    if (ok) {
      setDraft(trimmed);
    } else {
      setDraft(value);
      onError();
    }
  }

  return (
    <SettingsRow label={label}>
      <input
        type="text"
        placeholder="09:00"
        disabled={disabled}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value);
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
  );
}

export default function ControlSection({ initialFields }: ControlSectionProps): ReactNode {
  const [fields, setFields] = useState<ControlFields>(initialFields);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showError(): void {
    setToast('Не удалось сохранить настройку');
  }

  async function handleToggle(checked: boolean): Promise<void> {
    if (saving) return;

    const previous = fields.controlEnabled;
    setFields((prev) => ({ ...prev, controlEnabled: checked }));
    setSaving(true);

    const ok = await patchSettings({ controlEnabled: checked });
    setSaving(false);

    if (!ok) {
      setFields((prev) => ({ ...prev, controlEnabled: previous }));
      showError();
    }
  }

  async function handleDefaultMinutes(next: number): Promise<boolean> {
    setSaving(true);
    const ok = await patchSettings({ reactionNorms: { defaultMinutes: next } });
    setSaving(false);
    if (ok) setFields((prev) => ({ ...prev, defaultMinutes: next }));
    return ok;
  }

  async function handleReminderBeforePercent(next: number): Promise<boolean> {
    setSaving(true);
    const ok = await patchSettings({ reactionNorms: { reminderBeforePercent: next } });
    setSaving(false);
    if (ok) setFields((prev) => ({ ...prev, reminderBeforePercent: next }));
    return ok;
  }

  async function handleEscalateAfterPercent(next: number): Promise<boolean> {
    setSaving(true);
    const ok = await patchSettings({ reactionNorms: { escalateAfterPercent: next } });
    setSaving(false);
    if (ok) setFields((prev) => ({ ...prev, escalateAfterPercent: next }));
    return ok;
  }

  async function handleStageStuckDaysDefault(next: number): Promise<boolean> {
    setSaving(true);
    const ok = await patchSettings({ stageStuckDaysDefault: next });
    setSaving(false);
    if (ok) setFields((prev) => ({ ...prev, stageStuckDaysDefault: next }));
    return ok;
  }

  async function handleStuckCheckTime(next: string): Promise<boolean> {
    setSaving(true);
    const ok = await patchSettings({ stuckCheckTime: next });
    setSaving(false);
    if (ok) setFields((prev) => ({ ...prev, stuckCheckTime: next }));
    return ok;
  }

  async function handleSourceHealthThresholdHours(next: number): Promise<boolean> {
    setSaving(true);
    const ok = await patchSettings({ sourceHealthThresholdHours: next });
    setSaving(false);
    if (ok) setFields((prev) => ({ ...prev, sourceHealthThresholdHours: next }));
    return ok;
  }

  return (
    <SettingsCard icon="tabler:shield-check" title="Контроль">
      <SettingsRow label="Включить контроль">
        <Toggle
          checked={fields.controlEnabled}
          disabled={saving}
          onChange={handleToggle}
          aria-label="Включить контроль"
        />
      </SettingsRow>

      <NumberRow
        label="Норматив реакции по умолчанию"
        unit="мин"
        min={1}
        value={fields.defaultMinutes}
        disabled={saving}
        onCommit={handleDefaultMinutes}
        onError={showError}
      />

      <NumberRow
        label="Напоминание менеджеру"
        unit="% от норматива"
        min={1}
        max={100}
        value={fields.reminderBeforePercent}
        disabled={saving}
        onCommit={handleReminderBeforePercent}
        onError={showError}
      />

      <NumberRow
        label="Эскалация руководителю"
        unit="% от норматива"
        min={100}
        value={fields.escalateAfterPercent}
        disabled={saving}
        onCommit={handleEscalateAfterPercent}
        onError={showError}
      />

      <NumberRow
        label="Лимит зависания по умолчанию"
        unit="дн."
        min={1}
        value={fields.stageStuckDaysDefault}
        disabled={saving}
        onCommit={handleStageStuckDaysDefault}
        onError={showError}
      />

      <TimeRow
        label="Время ежедневной сводки"
        value={fields.stuckCheckTime}
        disabled={saving}
        onCommit={handleStuckCheckTime}
        onError={showError}
      />

      <NumberRow
        label="Порог молчания источника"
        unit="ч"
        min={1}
        value={fields.sourceHealthThresholdHours}
        disabled={saving}
        onCommit={handleSourceHealthThresholdHours}
        onError={showError}
      />

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </SettingsCard>
  );
}
