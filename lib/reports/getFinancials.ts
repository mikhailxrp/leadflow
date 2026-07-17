import 'server-only';

import { Prisma } from '@prisma/client';
import { isWithinRange } from '@/lib/adSpend/monthRange';
import { prisma } from '@/lib/prisma';
import type { FinancialReport } from '@/types/reports';

/**
 * Когорта — лиды, СОЗДАННЫЕ в [from,to] (Lead.createdAt), не закрытые в этом периоде
 * (closedAt не участвует нигде ниже). Это согласует расход↔лиды↔выручку одной когортой
 * привлечения (решение №6, phase-22.7.md) — лид, закрытый WON позже периода, всё равно
 * учитывается в выручке "своего" периода создания, а не периода закрытия.
 */
export async function getFinancials(
  companyId: string,
  from: Date,
  to: Date,
): Promise<FinancialReport> {
  const [totalLeads, qualifiedLeads, estimatedAgg, wonAgg, adSpendRecords] = await Promise.all([
    prisma.lead.count({ where: { companyId, createdAt: { gte: from, lte: to } } }),
    prisma.lead.count({
      where: { companyId, createdAt: { gte: from, lte: to }, qualification: 'QUALIFIED' },
    }),
    // closeType: null — открытые лиды; у LOST dealValueEstimated не зануляется
    // (только WON), поэтому скоуп именно по статусу закрытия, не по "сумма не null".
    prisma.lead.aggregate({
      where: { companyId, createdAt: { gte: from, lte: to }, closeType: null },
      _sum: { dealValueEstimated: true },
    }),
    prisma.lead.aggregate({
      where: { companyId, createdAt: { gte: from, lte: to }, closeType: 'WON' },
      _sum: { dealValueFinal: true },
    }),
    prisma.adSpend.findMany({ where: { companyId } }),
  ]);

  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  // Decimal-сложение до единственной финальной конвертации в Number — не
  // складываем уже сконвертированные суммы (float-дрейф на денежных полях).
  const adSpendSum = adSpendRecords
    .filter((record) => isWithinRange(record, fromIso, toIso))
    .reduce((sum, record) => sum.plus(record.amountWithVat), new Prisma.Decimal(0));

  const revenueInProgressDecimal = estimatedAgg._sum.dealValueEstimated ?? new Prisma.Decimal(0);
  const revenueCollectedDecimal = wonAgg._sum.dealValueFinal ?? new Prisma.Decimal(0);
  const totalRevenueDecimal = revenueInProgressDecimal.plus(revenueCollectedDecimal);

  const adSpend = adSpendSum.toNumber();
  const revenueInProgress = revenueInProgressDecimal.toNumber();
  const revenueCollected = revenueCollectedDecimal.toNumber();
  const totalRevenue = totalRevenueDecimal.toNumber();

  return {
    adSpend,
    totalLeads,
    costPerLead: totalLeads > 0 ? adSpend / totalLeads : null,
    qualifiedLeads,
    costPerQualifiedLead: qualifiedLeads > 0 ? adSpend / qualifiedLeads : null,
    // Уже в процентной шкале (0..100), не дробь — формула фазы включает ×100.
    qualifiedRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : null,
    revenueInProgress,
    revenueCollected,
    totalRevenue,
    romi: adSpend > 0 ? ((totalRevenue - adSpend) / adSpend) * 100 : null,
  };
}
