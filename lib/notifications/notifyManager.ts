import 'server-only';

import type { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_SETTINGS } from '@/constants/defaultCompanyData';
import {
  telegramTemplates,
  type NewLeadForManagerParams,
  type ReactionReminderParams,
} from '@/constants/telegramTemplates';
import { parseNotificationPreferences } from '@/lib/notifications/preferences';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';
import type { NotificationPreferences } from '@/types/users';

/**
 * Ключи операционных Telegram-алертов конкретному User. Отдельный словарь от EventType
 * и Notification.type — не смешивать (см. .docs/phases/phase-13.md, риск namespace-путаницы).
 */
type ManagerAlertPayloads = {
  NEW_LEAD: NewLeadForManagerParams;
  REACTION_REMINDED: ReactionReminderParams;
};

type ManagerAlertType = keyof ManagerAlertPayloads;

const ALERT_PREFERENCE_KEY: Record<ManagerAlertType, keyof NotificationPreferences> = {
  NEW_LEAD: 'assignedLead',
  REACTION_REMINDED: 'reactionReminder',
};

const ALERT_TEMPLATES: {
  [K in ManagerAlertType]: (payload: ManagerAlertPayloads[K]) => string;
} = {
  NEW_LEAD: telegramTemplates.newLeadForManager,
  REACTION_REMINDED: telegramTemplates.reactionReminder,
};

export type NotifyManagerUser = {
  id: string;
  companyId: string;
  telegramChatId: string | null;
  notificationPreferences: Prisma.JsonValue;
};

function getTelegramEnabled(settings: Prisma.JsonValue): boolean {
  if (
    settings &&
    typeof settings === 'object' &&
    !Array.isArray(settings) &&
    'telegramEnabled' in settings &&
    typeof settings.telegramEnabled === 'boolean'
  ) {
    return settings.telegramEnabled;
  }
  return DEFAULT_COMPANY_SETTINGS.telegramEnabled;
}

/**
 * Тройной гейт (компания включила Telegram + есть chatId + личная настройка не выключена).
 * Провал любого условия — тихий выход, без исключения; ошибка Bot API также не всплывает.
 */
export async function notifyManager<T extends ManagerAlertType>(
  user: NotifyManagerUser,
  type: T,
  payload: ManagerAlertPayloads[T],
): Promise<void> {
  if (!user.telegramChatId) return;

  const preferences = parseNotificationPreferences(user.notificationPreferences);
  if (!preferences[ALERT_PREFERENCE_KEY[type]]) return;

  const company = await prisma.company.findFirst({
    where: { id: user.companyId },
    select: { settings: true },
  });
  if (!company || !getTelegramEnabled(company.settings)) return;

  const text = ALERT_TEMPLATES[type](payload);
  await sendTelegramMessage(user.telegramChatId, text);
}
