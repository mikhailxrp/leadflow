import 'server-only';

import type { Prisma, PlatformRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type CompanyOwnershipInput = {
  createdByPlatformAdminId: string | null;
};

export type PlatformAdminIdentity = {
  id: string;
  role: PlatformRole;
};

export function visibilityWhere(
  admin: PlatformAdminIdentity,
): Prisma.CompanyWhereInput {
  if (admin.role === 'SUPER_ADMIN') {
    return {};
  }

  return {
    OR: [
      { createdByPlatformAdminId: admin.id },
      { accessGrants: { some: { platformAdminId: admin.id } } },
    ],
  };
}

export async function resolveOwnerRoles(
  ownerIds: Array<string | null>,
): Promise<Map<string, PlatformRole>> {
  const uniqueIds = Array.from(
    new Set(ownerIds.filter((id): id is string => id !== null)),
  );

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const owners = await prisma.platformAdmin.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, role: true },
  });

  return new Map(owners.map((owner) => [owner.id, owner.role]));
}

export function isPlatformCompany(
  company: CompanyOwnershipInput,
  ownerRole: PlatformRole | undefined,
): boolean {
  return company.createdByPlatformAdminId == null || ownerRole === 'SUPER_ADMIN';
}

export function canManageCompany(
  admin: PlatformAdminIdentity,
  company: CompanyOwnershipInput,
  ownerRole: PlatformRole | undefined,
): boolean {
  if (admin.role === 'SUPER_ADMIN') {
    return isPlatformCompany(company, ownerRole);
  }

  return company.createdByPlatformAdminId === admin.id;
}
