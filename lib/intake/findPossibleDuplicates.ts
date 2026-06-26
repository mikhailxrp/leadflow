import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const MAX_DUPLICATE_MATCHES = 5;

export type PossibleDuplicate = {
  id: string;
  name: string | null;
  matchType: 'PHONE' | 'EMAIL';
};

/**
 * Synchronous pre-create duplicate check (SELECT only — no DuplicateFlag).
 * Used by POST /api/leads before persisting a manually created lead.
 */
export async function findPossibleDuplicates(
  companyId: string,
  phone: string | null,
  email: string | null,
): Promise<PossibleDuplicate[]> {
  if (!phone && !email) {
    return [];
  }

  const orConditions: Prisma.LeadWhereInput[] = [];
  if (phone) {
    orConditions.push({ phone });
  }
  if (email) {
    orConditions.push({ email });
  }

  const matches = await prisma.lead.findMany({
    where: {
      companyId,
      OR: orConditions,
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_DUPLICATE_MATCHES,
    select: { id: true, name: true, phone: true, email: true },
  });

  return matches.map((match) => ({
    id: match.id,
    name: match.name,
    matchType: phone && match.phone === phone ? 'PHONE' : 'EMAIL',
  }));
}
