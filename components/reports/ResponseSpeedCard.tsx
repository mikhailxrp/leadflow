import type { ReactNode } from 'react';
import Card from '@/components/ui/Card';

interface ResponseSpeedCardProps {
  avgFirstResponseMinutes: number | null;
  unprocessed: number;
  stuck: number;
  withoutNextAction: number;
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} мин`;

  const hours = Math.floor(rounded / 60);
  const restMinutes = rounded % 60;
  if (hours < 24) {
    return restMinutes > 0 ? `${hours} ч ${restMinutes} мин` : `${hours} ч`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days} дн ${restHours} ч` : `${days} дн`;
}

type RiskTileKey = 'unprocessed' | 'stuck' | 'withoutNextAction';

const RISK_TILES: ReadonlyArray<{ key: RiskTileKey; label: string; colorVar: string }> = [
  { key: 'unprocessed', label: 'Необработанные', colorVar: 'var(--color-danger)' },
  { key: 'stuck', label: 'Зависшие', colorVar: 'var(--color-warning)' },
  { key: 'withoutNextAction', label: 'Без следующего действия', colorVar: 'var(--color-info)' },
];

export default function ResponseSpeedCard({
  avgFirstResponseMinutes,
  unprocessed,
  stuck,
  withoutNextAction,
}: ResponseSpeedCardProps): ReactNode {
  const values: Record<RiskTileKey, number> = { unprocessed, stuck, withoutNextAction };

  return (
    <Card padding="lg">
      <h2 className="mb-1 text-[14px] font-medium text-[var(--color-text-primary)]">
        Скорость первого ответа
      </h2>
      <p className="mb-1 text-[28px] font-medium leading-none text-[var(--color-text-primary)]">
        {avgFirstResponseMinutes === null ? '—' : formatMinutes(avgFirstResponseMinutes)}
      </p>
      <p className="mb-4 text-[12px] text-[var(--color-text-tertiary)]">
        Среднее время от создания лида до взятия в работу за выбранный период
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {RISK_TILES.map((tile) => (
          <div
            key={tile.key}
            className="rounded-[8px] border border-[0.5px] border-[var(--color-border)] p-[10px_12px]"
          >
            <p className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
              {tile.label}
            </p>
            <p className="text-[20px] font-medium leading-none" style={{ color: tile.colorVar }}>
              {values[tile.key]}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[var(--color-text-tertiary)]">
        Срез на сейчас — не за выбранный период
      </p>
    </Card>
  );
}
