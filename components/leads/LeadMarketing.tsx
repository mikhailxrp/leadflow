import Card from '@/components/ui/Card';

function MarketingIcon() {
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
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  tilda: 'Tilda',
  yandex: 'Яндекс Директ',
  wordpress: 'WordPress',
  api: 'API',
  manual: 'Вручную',
  csv: 'Импорт',
  import: 'Импорт',
  other: 'Другое',
};

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

interface LeadMarketingProps {
  source: string;
  marketing: Record<string, unknown>;
  utm: Record<string, unknown>;
}

export default function LeadMarketing({ source, marketing, utm }: LeadMarketingProps) {
  const marketingEntries = Object.entries(marketing);
  const utmEntries = Object.entries(utm);

  const hasMarketing = marketingEntries.length > 0;
  const hasUtm = utmEntries.length > 0;

  return (
    <Card padding="lg">
      <h2 className="mb-4 flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
        <MarketingIcon />
        Маркетинговые данные
      </h2>

      <div className="flex items-center justify-between gap-4 py-3">
        <span className="shrink-0 text-[13px] text-[var(--color-text-secondary)]">Источник</span>
        <span className="text-right text-[13px] text-[var(--color-text-primary)]">
          {SOURCE_LABELS[source] ?? source}
        </span>
      </div>

      {hasMarketing && (
        <div className="border-t border-[0.5px] border-[var(--color-border)] px-3 py-3">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Маркетинг
          </p>
          <div className="flex flex-col gap-2">
            {marketingEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="font-mono text-[12px] text-[var(--color-text-secondary)]">
                  {key}
                </span>
                <span className="break-all font-mono text-[12px] text-[var(--color-text-primary)]">
                  {renderValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasUtm && (
        <div className="border-t border-[0.5px] border-[var(--color-border)] px-3 py-3">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            UTM метки
          </p>
          <div className="flex flex-col gap-2">
            {utmEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="font-mono text-[12px] text-[var(--color-text-secondary)]">
                  {key}
                </span>
                <span className="break-all font-mono text-[12px] text-[var(--color-text-primary)]">
                  {renderValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
