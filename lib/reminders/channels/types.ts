import type { Lead, Reminder, User } from '@prisma/client';

export type ReminderWithContext = Reminder & {
  lead: Pick<Lead, 'name' | 'phone' | 'email'>;
  createdBy: Pick<User, 'telegramChatId' | 'email'>;
};

export interface ReminderChannel {
  /** Бросает при неуспехе — deliverChannels() ловит через Promise.allSettled. */
  deliver(reminder: ReminderWithContext): Promise<void>;
}
