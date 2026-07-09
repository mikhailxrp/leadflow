import type { UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { getLeadVisibility } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';

export type NotificationRecipient = {
  userId: string;
  role: UserRole;
};

/**
 * ALL → все активные пользователи компании.
 * OWN → HEAD/ADMIN (всегда) + назначенный менеджер (если он есть среди активных).
 */
export async function resolveNewLeadRecipients(
  companyId: string,
  lead: { assignedToId: string | null },
): Promise<NotificationRecipient[]> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });

  const leadVisibility = getLeadVisibility(company.settings);

  const activeUsers = await prisma.user.findMany({
    where: { companyId, isBlocked: false },
    select: { id: true, role: true },
  });

  const recipients =
    leadVisibility === 'ALL'
      ? activeUsers
      : activeUsers.filter(
          (user) => hasMinRole(user.role, 'HEAD') || user.id === lead.assignedToId,
        );

  return recipients.map((user) => ({ userId: user.id, role: user.role }));
}
