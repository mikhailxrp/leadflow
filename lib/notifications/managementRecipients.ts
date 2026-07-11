import type { Prisma, UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { prisma } from '@/lib/prisma';

export type ManagementRecipient = {
  id: string;
  companyId: string;
  role: UserRole;
  telegramChatId: string | null;
  notificationPreferences: Prisma.JsonValue;
};

/**
 * Активные HEAD+ пользователи компании — аудитория управленческих алертов
 * (эскалация, зависшие лиды, тишина источника). Аналог recipients.ts для новых лидов,
 * но по роли, не по видимости лида.
 */
export async function getManagementRecipients(
  companyId: string,
): Promise<ManagementRecipient[]> {
  const users = await prisma.user.findMany({
    where: { companyId, isBlocked: false },
    select: {
      id: true,
      companyId: true,
      role: true,
      telegramChatId: true,
      notificationPreferences: true,
    },
  });

  return users.filter((user) => hasMinRole(user.role, 'HEAD'));
}
