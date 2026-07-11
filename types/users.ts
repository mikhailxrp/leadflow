import type { UserRole } from '@prisma/client';

export type NotificationPreferences = {
  assignedLead: boolean;
  commentOnLead: boolean;
  reminders: boolean;
  reactionReminder: boolean;
  managementAlerts: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  assignedLead: true,
  commentOnLead: true,
  reminders: true,
  reactionReminder: true,
  managementAlerts: true,
};

export type UserProfileDetail = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
  telegram: string | null;
  max: string | null;
  otherContact: string | null;
  isBlocked: boolean;
  notificationPreferences: NotificationPreferences;
  telegramConnected: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type TeamMemberListItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  isBlocked: boolean;
};
