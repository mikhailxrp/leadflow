'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import Toggle from '@/components/settings/Toggle';

interface SecurityState {
  minPasswordLength: number;
  forcePasswordChange: boolean;
}

const INITIAL_STATE: SecurityState = {
  minPasswordLength: 8,
  forcePasswordChange: false,
};

interface SecuritySectionProps {
  onDirtyChange: (dirty: boolean) => void;
}

function isStateDirty(state: SecurityState): boolean {
  return JSON.stringify(state) !== JSON.stringify(INITIAL_STATE);
}

export default function SecuritySection({ onDirtyChange }: SecuritySectionProps) {
  const [state, setState] = useState<SecurityState>(INITIAL_STATE);

  useEffect(() => {
    onDirtyChange(isStateDirty(state));
  }, [state, onDirtyChange]);

  function update<K extends keyof SecurityState>(key: K, value: SecurityState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsCard icon="tabler:shield" title="Безопасность">
      <SettingsRow label="Минимальная длина пароля">
        <div className="w-[80px]">
          <Input
            type="number"
            min={6}
            max={32}
            value={state.minPasswordLength}
            onChange={(e) => update('minPasswordLength', Number(e.target.value))}
          />
        </div>
      </SettingsRow>

      <SettingsRow label="Принудительная смена пароля каждые 90 дней">
        <Toggle
          checked={state.forcePasswordChange}
          onChange={(checked) => update('forcePasswordChange', checked)}
          aria-label="Принудительная смена пароля каждые 90 дней"
        />
      </SettingsRow>

      <div className="mx-5 my-3">
        <Button
          variant="danger"
          type="button"
          className="!h-auto min-h-[36px] w-full py-2 sm:w-auto"
        >
          Сбросить пароль администратора
        </Button>
      </div>
    </SettingsCard>
  );
}
