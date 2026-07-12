import type { Prisma } from '@prisma/client';
import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'MANAGER',
      method: 'GET',
      pathname: `/api/leads/${id}/duplicates`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const companyId = actor.companyId;

  try {
    const visibility = actor.actor === 'user' ? visibilityWhere(actor.role, actor.userId) : {};

    const andConditions: Prisma.LeadWhereInput[] = [{ id }, { companyId }];
    if (Object.keys(visibility).length > 0) {
      andConditions.push(visibility);
    }

    const lead = await prisma.lead.findFirst({
      where: { AND: andConditions },
      select: { id: true },
    });

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Query both directions of DuplicateFlag
    const flags = await prisma.duplicateFlag.findMany({
      where: {
        companyId,
        OR: [{ leadId: id }, { matchedLeadId: id }],
      },
      select: { id: true, leadId: true, matchedLeadId: true, matchType: true },
    });

    if (flags.length === 0) {
      return Response.json([]);
    }

    // Resolve the "other side" lead for each flag
    const otherLeadIds = flags.map((flag) =>
      flag.leadId === id ? flag.matchedLeadId : flag.leadId,
    );

    const otherLeads = await prisma.lead.findMany({
      where: { id: { in: otherLeadIds }, companyId },
      select: { id: true, name: true, phone: true },
    });

    const otherLeadMap = new Map(otherLeads.map((l) => [l.id, l]));

    const duplicates = flags
      .map((flag) => {
        const otherId = flag.leadId === id ? flag.matchedLeadId : flag.leadId;
        const otherLead = otherLeadMap.get(otherId);
        if (!otherLead) return null;
        return {
          id: flag.id,
          matchType: flag.matchType,
          matchedLead: { id: otherLead.id, name: otherLead.name, phone: otherLead.phone },
        };
      })
      .filter(Boolean);

    return Response.json(duplicates);
  } catch (error) {
    console.error('[GET /api/leads/:id/duplicates] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
