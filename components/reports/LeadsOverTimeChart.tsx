'use client';

import type { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/ui/Card';
import type { LeadsBucket } from '@/types/reports';

const CHART_HEIGHT = 240;
const CHART_COLOR = 'var(--color-primary)';
const CHART_FILL = 'rgba(16, 185, 129, 0.1)';

interface LeadsOverTimeChartProps {
  buckets: LeadsBucket[];
  totalLeads: number;
}

function formatDayLabel(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: LeadsBucket }[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps): ReactNode {
  if (!active || !payload?.length) return null;
  const point = payload[0];

  return (
    <div className="rounded-[6px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[12px] shadow-sm">
      <p className="text-[var(--color-text-secondary)]">{formatDayLabel(point.payload.date)}</p>
      <p className="font-medium text-[var(--color-text-primary)]">{point.value} лидов</p>
    </div>
  );
}

export default function LeadsOverTimeChart({
  buckets,
  totalLeads,
}: LeadsOverTimeChartProps): ReactNode {
  return (
    <Card padding="lg">
      <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text-primary)]">
        Лиды по дням
      </h2>

      {totalLeads === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-[13px] text-[var(--color-text-tertiary)]">
          Нет лидов за выбранный период
        </div>
      ) : (
        <div className="h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                tickFormatter={formatDayLabel}
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
              <Area
                type="monotone"
                dataKey="count"
                stroke={CHART_COLOR}
                strokeWidth={2}
                fill={CHART_FILL}
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLOR, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
