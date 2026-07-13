'use client';

import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/ui/Card';
import type { LossReasonRow } from '@/types/reports';

const CHART_COLOR = 'var(--color-danger)';
const ROW_HEIGHT = 36;
const MIN_CHART_HEIGHT = 120;

interface LossReasonsChartProps {
  rows: LossReasonRow[];
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: LossReasonRow }[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps): ReactNode {
  if (!active || !payload?.length) return null;
  const point = payload[0];

  return (
    <div className="rounded-[6px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-[12px] shadow-sm">
      <p className="text-[var(--color-text-secondary)]">{point.payload.label}</p>
      <p className="font-medium text-[var(--color-text-primary)]">{point.value} отказов</p>
    </div>
  );
}

export default function LossReasonsChart({ rows }: LossReasonsChartProps): ReactNode {
  const chartHeight = Math.max(MIN_CHART_HEIGHT, rows.length * ROW_HEIGHT);

  return (
    <Card padding="lg">
      <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text-primary)]">
        Причины отказа
      </h2>

      {rows.length === 0 ? (
        <div className="flex h-[120px] items-center justify-center text-[13px] text-[var(--color-text-tertiary)]">
          Нет отказов за выбранный период
        </div>
      ) : (
        <div className="w-full min-w-0" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--color-border)" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                width={140}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-bg-surface-2)' }} />
              <Bar dataKey="count" fill={CHART_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
