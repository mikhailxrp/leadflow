import 'server-only';

import { prisma } from '@/lib/prisma';
import type { BySourceRow } from '@/types/reports';

/**
 * Период — по Lead.createdAt, как в getSummary.ts (единая конвенция для всех
 * отчётов за from…to, а не по closedAt).
 */
export async function getBySource(companyId: string, from: Date, to: Date): Promise<BySourceRow[]> {
  const [totalCounts, wonCounts] = await Promise.all([
    prisma.lead.groupBy({
      by: ['source'],
      where: { companyId, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ['source'],
      where: { companyId, createdAt: { gte: from, lte: to }, closeType: 'WON' },
      _count: { _all: true },
    }),
  ]);

  const wonCountBySource = new Map(wonCounts.map((row) => [row.source, row._count._all]));

  return totalCounts
    .map((row) => {
      const count = row._count._all;
      const wonCount = wonCountBySource.get(row.source) ?? 0;
      return {
        source: row.source,
        count,
        wonRate: count > 0 ? wonCount / count : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}
