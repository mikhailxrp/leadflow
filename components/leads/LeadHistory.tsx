import Card from '@/components/ui/Card';

interface HistoryEvent {
  id: string;
  title: string;
  meta: string;
}

const MOCK_HISTORY: HistoryEvent[] = [
  {
    id: '1',
    title: 'Статус изменён: Новый → В работе',
    meta: 'Алексей Д. • 12.05.2024, 14:35',
  },
  {
    id: '2',
    title: 'Назначен менеджер: Алексей Д.',
    meta: 'Система • 12.05.2024, 14:30',
  },
  {
    id: '3',
    title: 'Лид создан из Tilda',
    meta: 'API интеграция • 12.05.2024, 14:30',
  },
];

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

      <ul className="relative flex flex-col">
        {MOCK_HISTORY.map((event, index) => (
          <li
            key={event.id}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            {index < MOCK_HISTORY.length - 1 && (
              <span
                className="absolute left-[5px] top-3 h-full w-px bg-[var(--color-border)]"
                aria-hidden="true"
              />
            )}
            <span
              className="
                relative z-10 mt-1.5 h-[10px] w-[10px] shrink-0
                rounded-full border-2 border-[var(--color-primary)]
                bg-[var(--color-bg-surface)]
              "
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                {event.title}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">
                {event.meta}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
