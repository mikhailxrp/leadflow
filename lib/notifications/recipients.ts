import type { UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { prisma } from '@/lib/prisma';

export type NotificationRecipient = {
  userId: string;
  role: UserRole;
};

/**
 * HEAD/ADMIN (видят все лиды) + назначенный менеджер (если он есть среди активных) —
 * менеджер видит и работает только со своими лидами, уведомлять о чужих не за чем.
 */
export async function resolveNewLeadRecipients(
  companyId: string,
  lead: { assignedToId: string | null },
): Promise<NotificationRecipient[]> {
  const activeUsers = await prisma.user.findMany({
    where: { companyId, isBlocked: false },
    select: { id: true, role: true },
  });

  const recipients = activeUsers.filter(
    (user) => hasMinRole(user.role, 'HEAD') || user.id === lead.assignedToId,
  );

  return recipients.map((user) => ({ userId: user.id, role: user.role }));
}
