import 'server-only';

import { prisma } from '@/lib/prisma';

export type CascadeBlockedCompany = {
  id: string;
  name: string;
};

export type CascadeBlockResult = {
  companies: CascadeBlockedCompany[];
  blockedAt: Date;
};

export async function blockMarketer(
  marketerId: string,
  byPlatformAdminId: string,
): Promise<CascadeBlockResult> {
  const blockedAt = new Date();

  const companies = await prisma.$transaction(async (tx) => {
    await tx.platformAdmin.update({
      where: { id: marketerId },
      data: { isActive: false },
    });

    const targetCompanies = await tx.company.findMany({
      where: { createdByPlatformAdminId: marketerId, isBlocked: false },
      select: { id: true, name: true },
    });

    if (targetCompanies.length === 0) {
      return targetCompanies;
    }

    await tx.company.updateMany({
      where: { id: { in: targetCompanies.map((company) => company.id) } },
      data: { isBlocked: true, blockedByMarketerCascade: true },
    });

    for (const company of targetCompanies) {
      await tx.event.create({
        data: {
          companyId: company.id,
          type: 'COMPANY_BLOCKED',
          payload: { byPlatformAdminId, cascade: true },
        },
      });
    }

    return targetCompanies;
  });

  return { companies, blockedAt };
}

export async function unblockMarketer(
  marketerId: string,
  byPlatformAdminId: string,
): Promise<CascadeBlockedCompany[]> {
  return prisma.$transaction(async (tx) => {
    await tx.platformAdmin.update({
      where: { id: marketerId },
      data: { isActive: true },
    });

    const companies = await tx.company.findMany({
      where: {
        createdByPlatformAdminId: marketerId,
        blockedByMarketerCascade: true,
      },
      select: { id: true, name: true },
    });

    if (companies.length === 0) {
      return companies;
    }

    await tx.company.updateMany({
      where: { id: { in: companies.map((company) => company.id) } },
      data: { isBlocked: false, blockedByMarketerCascade: false },
    });

    for (const company of companies) {
      await tx.event.create({
        data: {
          companyId: company.id,
          type: 'COMPANY_UNBLOCKED',
          payload: { byPlatformAdminId, cascade: true },
        },
      });
    }

    return companies;
  });
}
