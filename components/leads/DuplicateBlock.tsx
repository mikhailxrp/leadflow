import Link from 'next/link';
import Card from '@/components/ui/Card';
import type { LeadDuplicateItem } from '@/lib/leads/getLeadById';

const MATCH_TYPE_LABELS: Record<string, string> = {
  PHONE: 'телефон',
  EMAIL: 'email',
};

function DuplicateIcon() {
  return (
    <svg
      className="h-4 w-4 text-[var(--color-warning)]"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface DuplicateBlockProps {
  duplicates: LeadDuplicateItem[];
}

export default function DuplicateBlock({ duplicates }: DuplicateBlockProps) {
  return (
    <Card padding="lg">
      <h2 className="mb-4 flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
        <DuplicateIcon />
        Похожие лиды
      </h2>

      {duplicates.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-secondary)]">Дублей не обнаружено</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {duplicates.map((dup) => (
            <li
              key={dup.id}
              className="flex items-center justify-between gap-3 rounded-[6px] border-[0.5px] border-[var(--color-border)] px-3 py-2.5"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <Link
                  href={`/leads/${dup.matchedLead.id}`}
                  className="truncate text-[13px] font-medium text-[var(--color-primary)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
                >
                  {dup.matchedLead.name ?? 'Без имени'}
                </Link>
                {dup.matchedLead.phone && (
                  <span className="text-[12px] text-[var(--color-text-tertiary)]">
                    {dup.matchedLead.phone}
                  </span>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-warning)]">
                {MATCH_TYPE_LABELS[dup.matchType] ?? dup.matchType}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
