import Card from '@/components/ui/Card';

function HistoryIcon() {
  return (
    <svg className="h-4 w-4 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function LeadHistory() {
  return (
    <Card padding="lg">
      <h2 className="mb-4 flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
        <HistoryIcon />
        История изменений
      </h2>

      <p className="text-[13px] text-[var(--color-text-secondary)]">Нет событий</p>
    </Card>
  );
}
