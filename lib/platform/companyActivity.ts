import { prisma } from '@/lib/prisma';
import type { PlatformAdminIdentity } from '@/lib/platform/companyVisibility';
import { visibilityWhere } from '@/lib/platform/companyVisibility';
import type { CompanyActivityResponse } from '@/types/platform';

export async function getCompanyActivity(
  periodStart: Date,
  admin: PlatformAdminIdentity,
): Promise<CompanyActivityResponse> {
  const [companies, lastLogins, leadCounts, activeUserCounts] =
    await Promise.all([
      prisma.company.findMany({
        where: visibilityWhere(admin),
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

  const companyActivity = companies.map((company) => ({
    companyId: company.id,
    companyName: company.name,
    lastLoginAt:
      lastLoginByCompanyId.get(company.id)?.toISOString() ?? null,
    leadCount: leadCountByCompanyId.get(company.id) ?? 0,
    activeUsers: activeUsersByCompanyId.get(company.id) ?? 0,
    createdAt: company.createdAt.toISOString(),
  }));

  if (admin.role !== 'SUPER_ADMIN') {
    return { companies: companyActivity };
  }

  const marketers = await prisma.platformAdmin.findMany({
    where: { role: 'MARKETER' },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
    },
  });

  const companiesCreatedCounts = await prisma.company.groupBy({
    by: ['createdByPlatformAdminId'],
    where: { createdByPlatformAdminId: { in: marketers.map((m) => m.id) } },
    _count: { _all: true },
  });

  const companiesCreatedByMarketerId = new Map(
    companiesCreatedCounts.map((row) => [
      row.createdByPlatformAdminId,
      row._count._all,
    ]),
  );

  const marketerActivity = marketers.map((marketer) => ({
    id: marketer.id,
    name: marketer.name,
    email: marketer.email,
    isActive: marketer.isActive,
    lastLoginAt: marketer.lastLoginAt?.toISOString() ?? null,
    companiesCreated: companiesCreatedByMarketerId.get(marketer.id) ?? 0,
  }));

  return { companies: companyActivity, marketers: marketerActivity };
}
