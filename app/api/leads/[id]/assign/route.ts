import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { assignLeadTo } from '@/lib/assignLead';
import { prisma } from '@/lib/prisma';
import { assignSchema } from '@/lib/validations/assign';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'HEAD')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId, id: actorUserId } = session.user;

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
      select: { id: true },
    });

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
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
