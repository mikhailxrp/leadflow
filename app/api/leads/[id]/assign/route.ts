import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { assignLeadTo } from '@/lib/assignLead';
import { prisma } from '@/lib/prisma';
import { assignSchema } from '@/lib/validations/assign';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let user;
  try {
    user = await requireCompanyUser({ minRole: 'HEAD' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id } = await params;
  const { companyId, userId: actorUserId } = user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { managerId } = parsed.data;

  try {
    const lead = await prisma.lead.findFirst({
      where: { id, companyId },
      select: { id: true, closeType: true },
    });

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (lead.closeType !== null) {
      return Response.json({ error: 'LEAD_CLOSED' }, { status: 400 });
    }

    if (managerId !== null) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, companyId },
        select: { isBlocked: true },
      });

      if (!manager || manager.isBlocked) {
        return Response.json({ error: 'WRONG_COMPANY' }, { status: 400 });
      }
    }

    await assignLeadTo(id, companyId, managerId, actorUserId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/leads/:id/assign] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
