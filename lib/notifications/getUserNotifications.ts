import { prisma } from '@/lib/prisma';
import { DEFAULT_NOTIFICATIONS_LIMIT } from '@/constants/notifications';
import type { NotificationItem } from '@/store/notificationStore';

export interface UserNotificationsResult {
  items: NotificationItem[];
  unreadCount: number;
}

export async function getUserNotifications(
  userId: string,
  companyId: string,
  limit: number = DEFAULT_NOTIFICATIONS_LIMIT,
): Promise<UserNotificationsResult> {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        leadId: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, companyId, readAt: null },
    }),
  ]);

  const items: NotificationItem[] = rows.map((row) => ({
    ...row,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));

  return { items, unreadCount };
}
