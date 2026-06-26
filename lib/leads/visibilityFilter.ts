import type { Prisma, UserRole } from '@prisma/client';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/constants/defaultCompanyData';
import { hasMinRole } from '@/constants/roles';

export function getLeadVisibility(settings: unknown): CompanySettings['leadVisibility'] {
  if (
    settings &&
    typeof settings === 'object' &&
    'leadVisibility' in settings &&
    (settings.leadVisibility === 'ALL' || settings.leadVisibility === 'OWN')
  ) {
    return settings.leadVisibility;
  }
  return DEFAULT_COMPANY_SETTINGS.leadVisibility;
}

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
