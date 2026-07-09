import { resolveNewLeadRecipients } from '@/lib/notifications/recipients';
import { prisma } from '@/lib/prisma';
import { broadcastPerUser } from '@/lib/sse';

export type NewLeadBroadcastPayload = {
  notificationId: string;
  leadId: string;
  name: string | null;
  source: string;
};

/**
 * Единая точка запуска: SSE + persist в этой фазе, Telegram — Phase 13 (тот же файл).
 * Не пишет Event — LEAD_CREATED уже записан в транзакции createLead(), Notification — производная доставка.
 */
export async function notifyNewLead(leadId: string, companyId: string): Promise<void> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId },
    select: { id: true, name: true, source: true, assignedToId: true },
  });

  if (!lead) return;

  const recipients = await resolveNewLeadRecipients(companyId, lead);
  if (recipients.length === 0) return;

  const title = 'Новый лид';
  const body = lead.name ?? lead.source;

  const notifications = await prisma.$transaction(
    recipients.map((recipient) =>
      prisma.notification.create({
        data: {
          companyId,
          userId: recipient.userId,
          type: 'LEAD_CREATED' as const,
          leadId: lead.id,
          title,
          body,
        },
        select: { id: true, userId: true },
      }),
    ),
  );

  // Каждый получатель — своя строка Notification, свой id; broadcastPerUser даёт каждому
  // соединению payload именно с ЕГО notificationId, а не общий на всех (иначе клик по
  // уведомлению, пришедшему через SSE, нечем было бы пометить прочитанным).
  const payloadByUserId = new Map<string, NewLeadBroadcastPayload>(
    notifications.map((notification) => [
      notification.userId,
      {
        notificationId: notification.id,
        leadId: lead.id,
        name: lead.name,
        source: lead.source,
      },
    ]),
  );

  broadcastPerUser(companyId, payloadByUserId);

  // Telegram delivery — Phase 13: branches from here after the SSE broadcast above.
}
