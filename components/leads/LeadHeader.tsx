import Link from 'next/link';
import type { CloseType } from '@prisma/client';

const CLOSE_TYPE_LABELS: Record<CloseType, string> = {
  WON: 'Сделка',
  LOST: 'Отказ',
};

const CLOSE_TYPE_COLORS: Record<CloseType, { bg: string; text: string }> = {
  WON: { bg: '#D1FAE5', text: '#065F46' },
  LOST: { bg: '#FEE2E2', text: '#991B1B' },
};

interface LeadHeaderProps {
  name: string | null;
  stage: { name: string; color: string };
  closeType: CloseType | null;
}

export default function LeadHeader({ name, stage, closeType }: LeadHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <Link
          href="/leads"
          className="text-[13px] text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
        >
          ← Назад к лидам
        </Link>
        <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
          {name ?? 'Без имени'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium text-white"
          style={{ backgroundColor: stage.color }}
        >
          {stage.name}
        </span>

        {closeType !== null && (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
            style={{
              backgroundColor: CLOSE_TYPE_COLORS[closeType].bg,
              color: CLOSE_TYPE_COLORS[closeType].text,
            }}
          >
            {CLOSE_TYPE_LABELS[closeType]}
          </span>
        )}
      </div>
    </header>
  );
}
