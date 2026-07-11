import { deliver as email } from './email';
import { deliver as telegram } from './telegram';
import type { ReminderWithContext } from './types';

const channels: Record<string, (reminder: ReminderWithContext) => Promise<void>> = {
  telegram,
  email,
};

export type ChannelDeliveryResult =
  | { channel: string; ok: true }
  | { channel: string; ok: false; error: unknown };

/**
 * Результат явно привязан к имени канала — голый Promise.allSettled() этого не даёт,
 * а имя канала нужно для payload.channel в событии REMINDER_FAILED.
 */
export async function deliverChannels(
  reminder: ReminderWithContext,
): Promise<ChannelDeliveryResult[]> {
  const activeChannels = (reminder.channels as string[]).filter((ch) => ch in channels);

  const settled = await Promise.allSettled(activeChannels.map((ch) => channels[ch](reminder)));

  return settled.map((result, i) => {
    const channel = activeChannels[i];
    return result.status === 'fulfilled'
      ? { channel, ok: true }
      : { channel, ok: false, error: result.reason };
  });
}
