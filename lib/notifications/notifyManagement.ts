import 'server-only';

import { DEFAULT_COMPANY_SETTINGS } from '@/constants/defaultCompanyData';
import {
  telegramTemplates,
  type ReactionEscalatedParams,
} from '@/constants/telegramTemplates';
import { getManagementRecipients } from '@/lib/notifications/managementRecipients';
import { parseNotificationPreferences } from '@/lib/notifications/preferences';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

/**
 * Ключи управленческих Telegram-алертов (HEAD+). Реестр растёт в Таске 3 (зависшие лиды,
 * конец дня, тишина источника) — namespace отдельный от EventType/ManagerAlertType.
 */
type ManagementAlertPayloads = {
  ESCALATED: ReactionEscalatedParams;
};

type ManagementAlertType = keyof ManagementAlertPayloads;

const ALERT_TEMPLATES: {
  [K in ManagementAlertType]: (payload: ManagementAlertPayloads[K]) => string;
} = {
  ESCALATED: telegramTemplates.reactionEscalated,
};

function getTelegramEnabled(settings: unknown): boolean {
  if (
    settings &&
    typeof settings === 'object' &&
    !Array.isArray(settings) &&
    'telegramEnabled' in settings &&
    typeof (settings as { telegramEnabled?: unknown }).telegramEnabled === 'boolean'
  ) {
    return (settings as { telegramEnabled: boolean }).telegramEnabled;
  }
  return DEFAULT_COMPANY_SETTINGS.telegramEnabled;
}

/**
 * Рассылает управленческий алерт всем HEAD+ компании. Гейт на каждого получателя —
 * company.telegramEnabled (один раз) + личный telegramChatId + личный ключ managementAlerts.
 * Провал одного получателя (нет chatId/preferences) не прерывает рассылку остальным;
 * sendTelegramMessage сам не бросает исключения (see lib/telegram.ts).
 */
export async function notifyManagement<T extends ManagementAlertType>(
  companyId: string,
  type: T,
  payload: ManagementAlertPayloads[T],
): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { id: companyId },
    select: { settings: true },
  });
  if (!company || !getTelegramEnabled(company.settings)) return;

  const recipients = await getManagementRecipients(companyId);
  if (recipients.length === 0) return;

  const text = ALERT_TEMPLATES[type](payload);

  for (const recipient of recipients) {
    if (!recipient.telegramChatId) continue;

    const preferences = parseNotificationPreferences(recipient.notificationPreferences);
    if (!preferences.managementAlerts) continue;

    await sendTelegramMessage(recipient.telegramChatId, text);
  }
}
