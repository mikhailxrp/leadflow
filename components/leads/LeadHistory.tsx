import Card from '@/components/ui/Card';
import { getEventLabel, type HistoryEventItem } from '@/constants/eventLabels';

function HistoryIcon() {
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface LeadHistoryProps {
  events: HistoryEventItem[];
}

/** ~6–7 строк событий; длинная история прокручивается внутри блока */
const HISTORY_LIST_MAX_HEIGHT_CLASS = 'max-h-[360px]';

export default function LeadHistory({ events }: LeadHistoryProps) {
  return (
    <Card padding="lg">
      <h2 className="mb-4 flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
        <HistoryIcon />
        История изменений
      </h2>

      {events.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-secondary)]">Нет событий</p>
      ) : (
        <div
          className={`custom-scrollbar -mr-1 overflow-y-auto pr-1 ${HISTORY_LIST_MAX_HEIGHT_CLASS}`}
          aria-label="Список событий"
        >
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-3 border-b-[0.5px] border-[var(--color-border)] pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-[13px] text-[var(--color-text-secondary)]">
                  {getEventLabel(event)}
                </span>
                <time
                  dateTime={event.createdAt}
                  className="shrink-0 text-[11px] text-[var(--color-text-tertiary)]"
                >
                  {formatTime(event.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
