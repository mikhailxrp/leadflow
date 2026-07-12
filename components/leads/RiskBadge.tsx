import { type ReactNode } from 'react';
import type { RiskLevel } from '@/lib/risk/computeRisk';

const LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; className: string }
> = {
  green: {
    label: 'Норма',
    className: 'text-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)]',
  },
  yellow: {
    label: 'Внимание',
    className: 'text-[var(--color-warning)] bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)]',
  },
  red: {
    label: 'Риск',
    className: 'text-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)]',
  },
  grey: {
    label: 'Закрыт',
    className: 'text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface-2)]',
  },
};

interface RiskBadgeProps {
  level: RiskLevel;
  reason: string | null;
}

export default function RiskBadge({ level, reason }: RiskBadgeProps): ReactNode {
  const { label, className } = LEVEL_CONFIG[level];

  return (
    <span
      title={reason ?? undefined}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}
