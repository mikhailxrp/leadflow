import type { Lead, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeLead } from './normalizeLead';

/**
 * Creates a lead and its LEAD_CREATED event in a single transaction.
 *
 * stageId is resolved via findFirst + orderBy: { order: asc } — never hardcoded.
 * assignedToId is intentionally null; assignLead runs after commit (Phase 11).
 * writeEvent is NOT called here because it uses the global prisma client and
 * calls auth() — it cannot participate in the $transaction context.
 *
 * sourceLabel (universal webhook key label) is layered on top of the marketing
 * bucket produced by normalizeLead — it never overwrites fields already present
 * in the request body under that key.
 */
export async function createLead(
  raw: Record<string, unknown>,
  source: string,
  companyId: string,
  sourceLabel?: string,
): Promise<Lead> {
  const normalized = normalizeLead(raw, source);

  const marketing = sourceLabel
    ? { ...(normalized.marketing as Record<string, unknown>), sourceLabel }
    : normalized.marketing;

  const stage = await prisma.pipelineStage.findFirst({
    where: { companyId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });

  if (!stage) {
    throw new Error(`No pipeline stages found for company ${companyId}`);
  }

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        companyId,
        source,
        stageId: stage.id,
        assignedToId: null,
        name: normalized.name,
        phone: normalized.phone,
        email: normalized.email,
        comment: normalized.comment,
        utm: normalized.utm as Prisma.InputJsonValue,
        marketing: marketing as Prisma.InputJsonValue,
        customFields: normalized.customFields as Prisma.InputJsonValue,
      },
    });

    await tx.event.create({
      data: {
        companyId,
        leadId: lead.id,
        userId: null,
        type: 'LEAD_CREATED',
        payload: { source },
      },
    });

    return lead;
  });
}
