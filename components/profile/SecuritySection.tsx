'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import PasswordStrength, { calculatePasswordStrength } from '@/components/profile/PasswordStrength';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';

interface SecurityState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const INITIAL_STATE: SecurityState = {
  currentPassword: 'password',
  newPassword: '',
  confirmPassword: '',
};

interface SecuritySectionProps {
  onDirtyChange: (dirty: boolean) => void;
}

function isStateDirty(state: SecurityState): boolean {
  return (
    state.newPassword !== INITIAL_STATE.newPassword ||
    state.confirmPassword !== INITIAL_STATE.confirmPassword
  );
}

const inputBaseClass = `
  h-[36px] w-full rounded-[6px]
  border-[0.5px] border-[var(--color-border)]
  bg-[var(--color-bg-surface)]
  text-[14px] text-[var(--color-text-primary)]
  placeholder:text-[var(--color-text-tertiary)]
  transition-all duration-150 outline-none
  focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
`;

export default function SecuritySection({ onDirtyChange }: SecuritySectionProps) {
  const [state, setState] = useState<SecurityState>(INITIAL_STATE);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  useEffect(() => {
    onDirtyChange(isStateDirty(state));
  }, [state, onDirtyChange]);

  function update<K extends keyof SecurityState>(key: K, value: SecurityState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  const passwordStrength = calculatePasswordStrength(state.newPassword);
  const displayStrength = state.newPassword ? passwordStrength : 4;

  return (
    <ProfileSectionCard icon="tabler:lock" title="Безопасность">
      <ProfileRow label="Текущий пароль">
        <div className="relative flex-1">
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            value={showCurrentPassword ? state.currentPassword : '••••••••'}
            readOnly
            className={`${inputBaseClass} pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] transition-colors duration-150 hover:text-[var(--color-text-secondary)]"
            aria-label={showCurrentPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <Icon icon="tabler:eye" className="h-4 w-4" />
          </button>
        </div>
      </ProfileRow>

      <ProfileRow label="Новый пароль">
        <div className="flex flex-1 flex-col">
          <input
            type="password"
            placeholder="Введите новый пароль"
            value={state.newPassword}
            onChange={(e) => update('newPassword', e.target.value)}
            className={inputBaseClass}
          />
          <div className="mt-2">
            <PasswordStrength strength={displayStrength} />
          </div>
          <span className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
            Минимум 8 символов
          </span>
        </div>
      </ProfileRow>

      <ProfileRow label="Подтвердить пароль">
        <div className="flex-1">
          <input
            type="password"
            placeholder="Повторите пароль"
            value={state.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            className={inputBaseClass}
          />
        </div>
      </ProfileRow>

      <div className="flex justify-end px-6 py-3">
        <Button
          variant="secondary"
          size="md"
          type="button"
          onClick={() => {
            // TODO: implement password change
          }}
        >
          Сменить пароль
        </Button>
      </div>
    </ProfileSectionCard>
  );
}
