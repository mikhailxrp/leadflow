import 'server-only';

import { DEFAULT_COMPANY_SETTINGS } from '@/constants/defaultCompanyData';
import {
  telegramTemplates,
  type EndOfDaySummaryParams,
  type ReactionEscalatedParams,
  type SourceDownParams,
  type StuckLeadsSummaryParams,
} from '@/constants/telegramTemplates';
import { getManagementRecipients } from '@/lib/notifications/managementRecipients';
import { parseNotificationPreferences } from '@/lib/notifications/preferences';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

/**
 * Ключи управленческих Telegram-алертов (HEAD+) — эскалация, зависшие лиды, конец дня,
 * тишина источника (Phase 17). Namespace отдельный от EventType/ManagerAlertType.
 */
type ManagementAlertPayloads = {
  ESCALATED: ReactionEscalatedParams;
  STUCK_LEADS_SUMMARY: StuckLeadsSummaryParams;
  END_OF_DAY_SUMMARY: EndOfDaySummaryParams;
  SOURCE_DOWN: SourceDownParams;
};

type ManagementAlertType = keyof ManagementAlertPayloads;

const ALERT_TEMPLATES: {
  [K in ManagementAlertType]: (payload: ManagementAlertPayloads[K]) => string;
} = {
  ESCALATED: telegramTemplates.reactionEscalated,
  STUCK_LEADS_SUMMARY: telegramTemplates.stuckLeadsSummary,
  END_OF_DAY_SUMMARY: telegramTemplates.endOfDaySummary,
  SOURCE_DOWN: telegramTemplates.sourceDown,
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
