import { sendTelegramMessage } from '@/lib/telegram';
import type { ReminderWithContext } from './types';

function buildReminderMessage(reminder: ReminderWithContext): string {
  const leadLabel = reminder.lead.name ?? reminder.lead.phone ?? reminder.lead.email ?? '—';

  return ['🔔 Напоминание по лиду', `Лид: ${leadLabel}`, '', reminder.text].join('\n');
}

export async function deliver(reminder: ReminderWithContext): Promise<void> {
  const chatId = reminder.createdBy.telegramChatId;
  if (!chatId) {
    throw new Error('Telegram не привязан');
  }

  // sendTelegramMessage сама глотает сетевые ошибки и возвращает false — превращаем в throw,
  // иначе Promise.allSettled не узнает о сбое.
  const ok = await sendTelegramMessage(chatId, buildReminderMessage(reminder));
  if (!ok) {
    throw new Error('Telegram sendMessage failed');
  }
}
