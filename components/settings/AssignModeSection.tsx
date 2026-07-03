'use client';

import { useState, type ReactNode } from 'react';
import SettingsCard from '@/components/settings/SettingsCard';
import Toast from '@/components/ui/Toast';

type AssignMode = 'MANUAL' | 'ROUND_ROBIN';

interface RadioOptionProps {
  checked: boolean;
  title: string;
  description: string;
  disabled: boolean;
  onSelect: () => void;
}

function RadioOption({ checked, title, description, disabled, onSelect }: RadioOptionProps): ReactNode {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full cursor-pointer items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`
          mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full
          border-[0.5px] border-[var(--color-border)]
          ${checked ? 'border-[#10B981]' : 'bg-[var(--color-bg-surface)]'}
        `}
        aria-hidden="true"
      >
        {checked && <span className="h-2 w-2 rounded-full bg-[#10B981]" />}
      </span>
      <span>
        <span className="block text-[14px] text-[var(--color-text-primary)]">{title}</span>
        <span className="mt-0.5 block text-[12px] text-[var(--color-text-secondary)]">
          {description}
        </span>
      </span>
    </button>
  );
}

interface AssignModeSectionProps {
  initialAssignMode: AssignMode;
}

export default function AssignModeSection({ initialAssignMode }: AssignModeSectionProps): ReactNode {
  const [mode, setMode] = useState<AssignMode>(initialAssignMode);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleSelect(next: AssignMode): Promise<void> {
    if (next === mode || saving) return;

    const previous = mode;
    setMode(next);
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignMode: next }),
      });

      if (!res.ok) {
        setMode(previous);
        setToast('Не удалось сохранить режим распределения');
        return;
      }

      setToast('Режим распределения сохранён');
    } catch {
      setMode(previous);
      setToast('Не удалось сохранить режим распределения');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard icon="tabler:arrows-shuffle" title="Распределение лидов">
      <div className="flex flex-col gap-3 px-5 py-3">
        <RadioOption
          checked={mode === 'MANUAL'}
          title="Вручную"
          description="Лид без подходящего правила остаётся без ответственного — Руководитель или Администратор назначает его вручную"
          disabled={saving}
          onSelect={() => handleSelect('MANUAL')}
        />
        <RadioOption
          checked={mode === 'ROUND_ROBIN'}
          title="Автоматически (Round-robin)"
          description="Лид без подходящего правила распределяется по кругу между активными менеджерами"
          disabled={saving}
          onSelect={() => handleSelect('ROUND_ROBIN')}
        />
      </div>

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </SettingsCard>
  );
}
