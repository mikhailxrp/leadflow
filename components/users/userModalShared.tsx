'use client';

import { type ReactNode } from 'react';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import IconButton from '@/components/ui/IconButton';

export type UserStatus = 'active' | 'blocked';

interface RadioOptionProps {
  checked: boolean;
  label: string;
  onSelect: () => void;
}

function RadioOption({ checked, label, onSelect }: RadioOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex cursor-pointer items-center gap-2"
    >
      <span
        className={`
          flex h-4 w-4 shrink-0 items-center justify-center rounded-full
          border-[0.5px] border-[var(--color-border)]
          ${checked ? 'border-[#10B981]' : 'bg-[var(--color-bg-surface)]'}
        `}
        aria-hidden="true"
      >
        {checked && <span className="h-2 w-2 rounded-full bg-[#10B981]" />}
      </span>
      <span className="text-[14px] text-[var(--color-text-primary)]">{label}</span>
    </button>
  );
}

interface StatusRadioGroupProps {
  value: UserStatus;
  onChange: (status: UserStatus) => void;
  name: string;
}

export default function StatusRadioGroup({ value, onChange, name }: StatusRadioGroupProps) {
  return (
    <div className="flex gap-4" role="radiogroup" aria-label={name}>
      <RadioOption
        checked={value === 'active'}
        label="Активен"
        onSelect={() => onChange('active')}
      />
      <RadioOption
        checked={value === 'blocked'}
        label="Заблокирован"
        onSelect={() => onChange('blocked')}
      />
    </div>
  );
}

interface RoleRadioGroupProps {
  value: PrismaUserRole;
  onChange: (role: PrismaUserRole) => void;
  name: string;
}

export function RoleRadioGroup({ value, onChange, name }: RoleRadioGroupProps): ReactNode {
  return (
    <div className="flex gap-4" role="radiogroup" aria-label={name}>
      <RadioOption
        checked={value === 'MANAGER'}
        label="Менеджер"
        onSelect={() => onChange('MANAGER')}
      />
      <RadioOption
        checked={value === 'HEAD'}
        label="Руководитель"
        onSelect={() => onChange('HEAD')}
      />
      <RadioOption
        checked={value === 'ADMIN'}
        label="Администратор"
        onSelect={() => onChange('ADMIN')}
      />
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps): ReactNode {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">{title}</h2>
      <IconButton
        size="sm"
        onClick={onClose}
        aria-label="Закрыть"
        icon={<span aria-hidden="true">✕</span>}
      />
    </div>
  );
}

export const disabledInputClass = `
  disabled:cursor-not-allowed
  disabled:border-[var(--color-border)]
  disabled:bg-[var(--color-bg-surface-2)]
  disabled:text-[var(--color-text-secondary)]
`;
