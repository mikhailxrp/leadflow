import type { UserRole } from '@prisma/client';

export const ROLE_RANK: Record<UserRole, number> = {
  MANAGER: 0,
  HEAD: 1,
  ADMIN: 2,
};

export function hasMinRole(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
