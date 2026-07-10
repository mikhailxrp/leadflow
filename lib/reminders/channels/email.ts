import { isEmailConfigured, sendEmail } from '@/lib/email';
import type { ReminderWithContext } from './types';

export async function deliver(reminder: ReminderWithContext): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('SMTP не настроен');
  }

  await sendEmail({
    to: reminder.createdBy.email,
    subject: `🔔 Напоминание: ${reminder.lead.name ?? 'лид'}`,
    text: reminder.text,
  });
}
