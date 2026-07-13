'use client';

import type { ReactNode } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/ui/Card';
import type { StageConversionRow } from '@/types/reports';

const CHART_HEIGHT = 240;
const CHART_COLOR = 'var(--color-primary)';

interface StageConversionChartProps {
  conversionByStage: StageConversionRow[];
  wonRate: number;
  totalLeads: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: StageConversionRow }[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps): ReactNode {
  if (!active || !payload?.length) return null;
  const point = payload[0];

  return (
    <div className="rounded-[6px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[12px] shadow-sm">
      <p className="text-[var(--color-text-secondary)]">{point.payload.name}</p>
      <p className="font-medium text-[var(--color-text-primary)]">{point.value} лидов</p>
    </div>
  );
}

export default function StageConversionChart({
  conversionByStage,
  wonRate,
  totalLeads,
}: StageConversionChartProps): ReactNode {
  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">
          Конверсия по этапам
        </h2>
        <span className="whitespace-nowrap text-[13px] font-medium text-[var(--color-primary)]">
          В сделку: {Math.round(wonRate * 100)}%
        </span>
      </div>

      {totalLeads === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-[13px] text-[var(--color-text-tertiary)]">
          Нет лидов за выбранный период
        </div>
      ) : (
        <div className="h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={conversionByStage} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                interval="preserveStartEnd"
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                width={28}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
