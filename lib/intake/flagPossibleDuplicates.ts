import type { Prisma } from '@prisma/client';
import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';

const MAX_DUPLICATE_MATCHES = 5;

/**
 * Post-commit duplicate check: marks up to 5 matching leads without blocking intake.
 * Errors are swallowed — callers use fire-and-forget (void … .catch).
 */
export async function flagPossibleDuplicates(
  leadId: string,
  companyId: string,
): Promise<void> {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, companyId },
      select: { id: true, phone: true, email: true },
    });

    if (!lead || (!lead.phone && !lead.email)) {
      return;
    }

    const orConditions: Prisma.LeadWhereInput[] = [];
    if (lead.phone) {
      orConditions.push({ phone: lead.phone });
    }
    if (lead.email) {
      orConditions.push({ email: lead.email });
    }

    const matches = await prisma.lead.findMany({
      where: {
        companyId,
        id: { not: leadId },
        OR: orConditions,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_DUPLICATE_MATCHES,
      select: { id: true, phone: true, email: true },
    });

    for (const match of matches) {
      const matchType =
        lead.phone && match.phone === lead.phone ? 'PHONE' : 'EMAIL';

      await prisma.duplicateFlag.create({
        data: {
          companyId,
          leadId,
          matchedLeadId: match.id,
          matchType,
        },
      });

      await writeEvent(companyId, 'DUPLICATE_FLAGGED', {
        payload: { matchedLeadId: match.id, matchType },
        leadId,
      });
    }
  } catch (error) {
    console.error('[flagPossibleDuplicates] failed:', error);
  }
}
