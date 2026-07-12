import type { ReactNode } from 'react';
import { SOURCE_HEALTH_LABELS, type SourceHealthStatus } from '@/constants/integrations';

interface SourceHealthIndicatorProps {
  status: SourceHealthStatus;
  hoursSinceLastUse: number | null;
  thresholdHours: number;
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} мин`;
  }
  return `${Math.round(hours)} ч`;
}

/**
 * Только эмодзи + статус + количественная часть — без утверждений о том, что
 * алерт реально отправлен (это зона Phase 17, здесь мы это не проверяем).
 */
function describe(
  status: SourceHealthStatus,
  hoursSinceLastUse: number | null,
  thresholdHours: number,
): string {
  const { label } = SOURCE_HEALTH_LABELS[status];

  switch (status) {
    case 'not_configured':
      return `${label} — нет ни одной заявки с этого источника`;
    case 'active':
      return hoursSinceLastUse === null
        ? label
        : `${label} — последняя заявка ${formatDuration(hoursSinceLastUse)} назад`;
    case 'silent':
      return hoursSinceLastUse === null
        ? label
        : `${label} ${formatDuration(hoursSinceLastUse)} (порог: ${formatDuration(thresholdHours)})`;
    case 'down':
      return hoursSinceLastUse === null
        ? label
        : `${label} ${formatDuration(hoursSinceLastUse)}`;
  }
}

export default function SourceHealthIndicator({
  status,
  hoursSinceLastUse,
  thresholdHours,
}: SourceHealthIndicatorProps): ReactNode {
  const { emoji } = SOURCE_HEALTH_LABELS[status];
  const text = describe(status, hoursSinceLastUse, thresholdHours);

  return (
    <p className="flex items-start gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
      <span aria-hidden="true">{emoji}</span>
      <span>{text}</span>
    </p>
  );
}
