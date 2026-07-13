import 'server-only';

import { prisma } from '@/lib/prisma';
import type { LossReasonRow } from '@/types/reports';

const NO_REASON_LABEL = 'Без причины';

/**
 * Период — по Lead.createdAt (единая конвенция с getSummary.ts/getBySource.ts).
 * lossReasonId=null не отбрасывается — отдельная явная строка «Без причины»,
 * иначе сумма причин молча разойдётся с реальным числом LOST-лидов за период.
 */
export async function getLossReasonsBreakdown(
  companyId: string,
  from: Date,
  to: Date,
): Promise<LossReasonRow[]> {
  const counts = await prisma.lead.groupBy({
    by: ['lossReasonId'],
    where: { companyId, closeType: 'LOST', createdAt: { gte: from, lte: to } },
    _count: { _all: true },
  });

  const reasonIds = counts
    .map((row) => row.lossReasonId)
    .filter((id): id is string => id !== null);

  const reasons =
    reasonIds.length === 0
      ? []
      : await prisma.lossReason.findMany({
          where: { id: { in: reasonIds }, companyId },
          select: { id: true, label: true },
        });
  const labelById = new Map(reasons.map((reason) => [reason.id, reason.label]));

  return counts
    .map((row) => ({
      lossReasonId: row.lossReasonId,
      label: row.lossReasonId ? labelById.get(row.lossReasonId) ?? row.lossReasonId : NO_REASON_LABEL,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);
}
