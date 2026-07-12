import { type ReactNode } from 'react';
import type { LeadQualification } from '@prisma/client';

const CONFIG: Record<'QUALIFIED' | 'DISQUALIFIED' | 'NONE', { label: string; className: string }> = {
  QUALIFIED: {
    label: 'Целевой',
    className:
      'text-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)]',
  },
  DISQUALIFIED: {
    label: 'Нецелевой',
    className: 'text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface-2)]',
  },
  NONE: {
    label: 'Не оценён',
    className: 'text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface-2)]',
  },
};

interface QualificationBadgeProps {
  qualification: LeadQualification | null;
}

export default function QualificationBadge({
  qualification,
}: QualificationBadgeProps): ReactNode {
  const { label, className } = CONFIG[qualification ?? 'NONE'];

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}
