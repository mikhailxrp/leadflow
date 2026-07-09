import type { Prisma } from '@prisma/client';
import { parseNotificationPreferences } from '@/lib/notifications/preferences';
import type { UserProfileDetail } from '@/types/users';

export const USER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  avatarUrl: true,
  telegram: true,
  max: true,
  otherContact: true,
  isBlocked: true,
  notificationPreferences: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

type UserProfileRow = Prisma.UserGetPayload<{
  select: typeof USER_PROFILE_SELECT;
}>;

export function toUserProfileDetail(user: UserProfileRow): UserProfileDetail {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    telegram: user.telegram,
    max: user.max,
    otherContact: user.otherContact,
    isBlocked: user.isBlocked,
    notificationPreferences: parseNotificationPreferences(
      user.notificationPreferences,
    ),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
