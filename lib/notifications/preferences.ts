import type { Prisma } from '@prisma/client';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '@/types/users';

export function parseNotificationPreferences(
  value: Prisma.JsonValue,
): NotificationPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const record = value as Record<string, unknown>;

  return {
    assignedLead:
      typeof record.assignedLead === 'boolean'
        ? record.assignedLead
        : DEFAULT_NOTIFICATION_PREFERENCES.assignedLead,
    commentOnLead:
      typeof record.commentOnLead === 'boolean'
        ? record.commentOnLead
        : DEFAULT_NOTIFICATION_PREFERENCES.commentOnLead,
    reminders:
      typeof record.reminders === 'boolean'
        ? record.reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.reminders,
    reactionReminder:
      typeof record.reactionReminder === 'boolean'
        ? record.reactionReminder
        : DEFAULT_NOTIFICATION_PREFERENCES.reactionReminder,
    managementAlerts:
      typeof record.managementAlerts === 'boolean'
        ? record.managementAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.managementAlerts,
  };
}
