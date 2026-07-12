import type { Prisma } from '@prisma/client';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let user;
  try {
    user = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id } = await params;
  const { companyId, userId, role } = user;

  try {
    const visibility = visibilityWhere(role, userId);

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

    const existing = await prisma.event.findFirst({
      where: { leadId: id, companyId, type: 'LEAD_TAKEN_IN_WORK' },
      select: { id: true, createdAt: true },
    });

    if (existing) {
      return Response.json(
        { error: 'ALREADY_TAKEN', takenAt: existing.createdAt.toISOString() },
        { status: 400 },
      );
    }

    await writeEvent(companyId, 'LEAD_TAKEN_IN_WORK', { leadId: id, userId });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[POST /api/leads/:id/take] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
