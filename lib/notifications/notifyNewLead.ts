import { resolveNewLeadRecipients } from '@/lib/notifications/recipients';
import { prisma } from '@/lib/prisma';
import { broadcast } from '@/lib/sse';

export type NewLeadBroadcastPayload = {
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

  await prisma.notification.createMany({
    data: recipients.map((recipient) => ({
      companyId,
      userId: recipient.userId,
      type: 'LEAD_CREATED' as const,
      leadId: lead.id,
      title,
      body,
    })),
  });

  const recipientIds = new Set(recipients.map((recipient) => recipient.userId));
  const payload: NewLeadBroadcastPayload = {
    leadId: lead.id,
    name: lead.name,
    source: lead.source,
  };

  broadcast(companyId, payload, (connection) => recipientIds.has(connection.userId));

  // Telegram delivery — Phase 13: branches from here after the SSE broadcast above.
}
