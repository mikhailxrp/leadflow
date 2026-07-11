import 'server-only';

import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';

export type ControlSummaryKind = 'stuck' | 'endOfDay';

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSummaryPayload(payload: unknown, kind: ControlSummaryKind): boolean {
  return (
    !!payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    (payload as { kind?: unknown }).kind === kind
  );
}

/**
 * CONTROL_SUMMARY_SENT — company-level маркер (leadId: null), различается по payload.kind.
 * Один EventType на обе дневные сводки (зависшие лиды / конец дня) — фильтр по kind
 * обязателен здесь и только здесь, чтобы не продублировать его в двух cron-функциях.
 */
export async function hasSentSummaryToday(
  companyId: string,
  kind: ControlSummaryKind,
  now: Date,
): Promise<boolean> {
  const events = await prisma.event.findMany({
    where: {
      companyId,
      type: 'CONTROL_SUMMARY_SENT',
      leadId: null,
      createdAt: { gte: startOfDay(now) },
    },
    select: { payload: true },
  });

  return events.some((event) => isSummaryPayload(event.payload, kind));
}

export async function markSummarySent(
  companyId: string,
  kind: ControlSummaryKind,
): Promise<void> {
  await writeEvent(companyId, 'CONTROL_SUMMARY_SENT', {
    userId: null,
    leadId: null,
    payload: { kind },
  });
}
