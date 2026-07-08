import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeEvent } from '@/lib/events';

/**
 * Tri-state, not boolean: "matched_but_failed" (rule matched, both assignee
 * and fallback are blocked) must be distinguishable from "no_match" (no rule
 * applied) so assignLead only raises ASSIGNMENT_FAILED in the former case.
 */
export type AssignmentRuleResult = 'assigned' | 'matched_but_failed' | 'no_match';

function readSourceLabel(marketing: Prisma.JsonValue): string | null {
  if (!marketing || typeof marketing !== 'object' || Array.isArray(marketing)) {
    return null;
  }
  const value = (marketing as Record<string, unknown>).sourceLabel;
  return typeof value === 'string' ? value : null;
}

export async function tryAssignmentRules(
  leadId: string,
  companyId: string,
): Promise<AssignmentRuleResult> {
  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, companyId },
    select: { source: true, marketing: true },
  });

  const sourceLabel = readSourceLabel(lead.marketing);

  const rules = await prisma.assignmentRule.findMany({
    where: { companyId, isActive: true },
    orderBy: { priority: 'asc' },
    include: { assignTo: true, fallbackTo: true },
  });

  let matched = false;

  for (const rule of rules) {
    const sourceMatches = !rule.matchSource || rule.matchSource === lead.source;
    const labelMatches = !rule.matchSourceLabel || rule.matchSourceLabel === sourceLabel;
    if (!sourceMatches || !labelMatches) continue;

    matched = true;

    const target = !rule.assignTo.isBlocked
      ? rule.assignTo
      : rule.fallbackTo && !rule.fallbackTo.isBlocked
        ? rule.fallbackTo
        : null;

    if (!target) continue; // primary and fallback both inactive — try next rule

    const updated = await prisma.lead.updateMany({
      where: { id: leadId, companyId },
      data: { assignedToId: target.id },
    });
    if (updated.count === 0) continue;

    await writeEvent(companyId, 'ASSIGNED', {
      payload: { toUserId: target.id, viaRule: rule.id },
      leadId,
    });
    return 'assigned';
  }

  return matched ? 'matched_but_failed' : 'no_match';
}
