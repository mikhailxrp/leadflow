import Card from '@/components/ui/Card';

function BriefcaseIcon() {
  return (
    <svg
      className="h-4 w-4 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

interface LeadCustomFieldsProps {
  fields: Record<string, unknown>;
}

export default function LeadCustomFields({ fields }: LeadCustomFieldsProps) {
  const entries = Object.entries(fields);

  if (entries.length === 0) return null;

  return (
    <Card padding="lg">
      <h2 className="mb-5 flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
        <BriefcaseIcon />
        Дополнительные поля
      </h2>

      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex items-center justify-between gap-4 border-b border-[0.5px] border-[var(--color-border)] px-3 py-3 last:border-0"
        >
          <span className="shrink-0 text-[13px] text-[var(--color-text-secondary)]">{key}</span>
          <span className="break-all text-right text-[13px] text-[var(--color-text-primary)]">
            {renderValue(value)}
          </span>
        </div>
      ))}
    </Card>
  );
}
