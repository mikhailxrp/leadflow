import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeEvent } from '@/lib/events';
import { tryAssignmentRules } from '@/lib/assignmentRules';
import { pickNextManager } from '@/lib/roundRobin';

function readAssignMode(settings: Prisma.JsonValue): 'MANUAL' | 'ROUND_ROBIN' {
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const mode = (settings as Record<string, unknown>).assignMode;
    if (mode === 'ROUND_ROBIN') return 'ROUND_ROBIN';
  }
  return 'MANUAL'; // malformed/missing settings JSONB → MANUAL, not an exception
}

/**
 * Three-level assignment cascade, called after the intake transaction commits:
 *
 * 1. AssignmentRule (by source/label, priority order)
 * 2. Company.settings.assignMode fallback (MANUAL → leave unassigned / ROUND_ROBIN → next manager)
 * 3. ASSIGNMENT_FAILED — only when (a) a rule matched but couldn't assign and
 *    the fallback also failed, or (b) ROUND_ROBIN has no active managers.
 *    A plain MANUAL lead with no matching rule is normal and raises no event.
 */
export async function assignLead(leadId: string, companyId: string): Promise<void> {
  const ruleResult = await tryAssignmentRules(leadId, companyId);
  if (ruleResult === 'assigned') return;

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });
  const assignMode = readAssignMode(company.settings);

  if (assignMode === 'ROUND_ROBIN') {
    const managerId = await prisma.$transaction(async (tx) => {
      const pickedId = await pickNextManager(tx, companyId);
      if (!pickedId) return null;

      await tx.lead.updateMany({
        where: { id: leadId, companyId },
        data: { assignedToId: pickedId },
      });
      await tx.event.create({
        data: {
          companyId,
          leadId,
          userId: null,
          type: 'ASSIGNED',
          payload: { toUserId: pickedId },
        },
      });
      return pickedId;
    });

    if (managerId) return;

    await writeEvent(companyId, 'ASSIGNMENT_FAILED', { leadId });
    return;
  }

  // MANUAL fallback: unassigned is expected unless a rule matched and failed
  if (ruleResult === 'matched_but_failed') {
    await writeEvent(companyId, 'ASSIGNMENT_FAILED', { leadId });
  }
}

/** Manual assignment/unassignment — never touches roundRobinCursor. */
export async function assignLeadTo(
  leadId: string,
  companyId: string,
  managerId: string | null,
  actorUserId: string,
): Promise<void> {
  await prisma.lead.updateMany({
    where: { id: leadId, companyId },
    data: { assignedToId: managerId },
  });

  await writeEvent(companyId, 'ASSIGNED', {
    payload: { toUserId: managerId },
    userId: actorUserId,
    leadId,
  });
}
