import 'server-only';

import { deliverChannels } from '@/lib/reminders/channels';
import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';

export type ProcessRemindersResult = {
  processed: number;
  delivered: number;
  failed: number;
};

const REMINDER_SELECT_INCLUDE = {
  lead: { select: { name: true, phone: true, email: true } },
  createdBy: { select: { telegramChatId: true, email: true } },
} as const;

/**
 * Обрабатывает просроченные PENDING-напоминания по ВСЕМ компаниям сразу (без companyId
 * в where — это системная джоба, не запрос от лица одной компании) и без фильтра по
 * Company.isBlocked (уже взятые обязательства срабатывают независимо от блокировки).
 * Вызывается из POST /api/cron/reminders, защищённого CRON_SECRET.
 */
export async function processReminders(now: Date = new Date()): Promise<ProcessRemindersResult> {
  const dueReminders = await prisma.reminder.findMany({
    where: { status: 'PENDING', remindAt: { lte: now } },
    include: REMINDER_SELECT_INCLUDE,
  });

  let processed = 0;
  let delivered = 0;
  let failed = 0;

  for (const reminder of dueReminders) {
    try {
      // Idempotent guard — один UPDATE уже атомарен сам по себе, $transaction не нужна.
      const updated = await prisma.reminder.updateMany({
        where: { id: reminder.id, status: 'PENDING' },
        data: { status: 'FIRED', firedAt: now },
      });

      if (updated.count === 0) {
        // Уже обработано другим вызовом (например, ретрай crontab) — не ошибка.
        continue;
      }

      processed += 1;

      await writeEvent(reminder.companyId, 'REMINDER_FIRED', {
        leadId: reminder.leadId,
        payload: { reminderId: reminder.id },
      });

      const results = await deliverChannels(reminder);

      for (const result of results) {
        if (result.ok) {
          delivered += 1;
          continue;
        }

        failed += 1;
        await writeEvent(reminder.companyId, 'REMINDER_FAILED', {
          leadId: reminder.leadId,
          payload: { reminderId: reminder.id, channel: result.channel },
        });
      }
    } catch (error) {
      // Сбой одного напоминания не должен останавливать обработку остальных due-напоминаний.
      console.error('[processReminders] failed to process reminder', reminder.id, error);
    }
  }

  return { processed, delivered, failed };
}
