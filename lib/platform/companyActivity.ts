import { prisma } from '@/lib/prisma';
import type { CompanyActivityItem } from '@/types/platform';

export async function getCompanyActivity(
  periodStart: Date,
): Promise<CompanyActivityItem[]> {
  const [companies, lastLogins, leadCounts, activeUserCounts] =
    await Promise.all([
      prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      }),
      prisma.user.groupBy({
        by: ['companyId'],
        _max: { lastLoginAt: true },
      }),
      prisma.lead.groupBy({
        by: ['companyId'],
        where: { createdAt: { gte: periodStart } },
        _count: { _all: true },
      }),
      prisma.user.groupBy({
        by: ['companyId'],
        where: { isBlocked: false },
        _count: { _all: true },
      }),
    ]);

  const lastLoginByCompanyId = new Map(
    lastLogins.map((row) => [row.companyId, row._max.lastLoginAt]),
  );
  const leadCountByCompanyId = new Map(
    leadCounts.map((row) => [row.companyId, row._count._all]),
  );
  const activeUsersByCompanyId = new Map(
    activeUserCounts.map((row) => [row.companyId, row._count._all]),
  );

  return companies.map((company) => ({
    companyId: company.id,
    companyName: company.name,
    lastLoginAt:
      lastLoginByCompanyId.get(company.id)?.toISOString() ?? null,
    leadCount: leadCountByCompanyId.get(company.id) ?? 0,
    activeUsers: activeUsersByCompanyId.get(company.id) ?? 0,
    createdAt: company.createdAt.toISOString(),
  }));
}
