import type { Prisma, UserRole } from '@prisma/client';
import type { CompanySettings } from '@/constants/defaultCompanyData';
import { hasMinRole } from '@/constants/roles';

export function visibilityWhere(
  role: UserRole,
  userId: string,
  leadVisibility: CompanySettings['leadVisibility'],
): Prisma.LeadWhereInput {
  if (hasMinRole(role, 'HEAD')) {
    return {};
  }

  if (leadVisibility === 'OWN') {
    return { assignedToId: userId };
  }

  return {};
}
