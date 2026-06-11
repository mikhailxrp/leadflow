'use client';

import { useEffect, useState } from 'react';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import Toggle from '@/components/settings/Toggle';

type DistributionMode = 'round-robin' | 'manual';

interface DistributionState {
  mode: DistributionMode;
  activeManagersOnly: boolean;
}

const INITIAL_STATE: DistributionState = {
  mode: 'round-robin',
  activeManagersOnly: true,
};

interface DistributionSectionProps {
  onDirtyChange: (dirty: boolean) => void;
}

function isStateDirty(state: DistributionState): boolean {
  return JSON.stringify(state) !== JSON.stringify(INITIAL_STATE);
}

interface RadioOptionProps {
  checked: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}

function RadioOption({ checked, title, description, onSelect }: RadioOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full cursor-pointer items-start gap-3 text-left"
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

export default function DistributionSection({ onDirtyChange }: DistributionSectionProps) {
  const [state, setState] = useState<DistributionState>(INITIAL_STATE);

  useEffect(() => {
    onDirtyChange(isStateDirty(state));
  }, [state, onDirtyChange]);

  function update<K extends keyof DistributionState>(key: K, value: DistributionState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsCard icon="tabler:arrows-shuffle" title="Распределение лидов">
      <div className="flex flex-col gap-3 border-b-[0.5px] border-[var(--color-border)] px-5 py-3">
        <RadioOption
          checked={state.mode === 'round-robin'}
          title="Автоматически (Round-robin)"
          description="Лиды распределяются равномерно между менеджерами"
          onSelect={() => update('mode', 'round-robin')}
        />
        <RadioOption
          checked={state.mode === 'manual'}
          title="Вручную"
          description="Менеджер назначается при обработке лида"
          onSelect={() => update('mode', 'manual')}
        />
      </div>

      <SettingsRow label="Учитывать только активных менеджеров">
        <Toggle
          checked={state.activeManagersOnly}
          onChange={(checked) => update('activeManagersOnly', checked)}
          aria-label="Учитывать только активных менеджеров"
        />
      </SettingsRow>
    </SettingsCard>
  );
}
