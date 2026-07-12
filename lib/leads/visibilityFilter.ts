import type { Prisma, UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';

export function visibilityWhere(role: UserRole, userId: string): Prisma.LeadWhereInput {
  if (hasMinRole(role, 'HEAD')) {
    return {};
  }

  return { assignedToId: userId };
}
