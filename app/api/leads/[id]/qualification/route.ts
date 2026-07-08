import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { qualificationSchema } from '@/lib/validations/leads';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'HEAD',
      method: 'PATCH',
      pathname: `/api/leads/${id}/qualification`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { companyId } = actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = qualificationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { qualification } = parsed.data;

  try {
    const qualifiedAt = qualification !== null ? new Date() : null;

    const result = await prisma.lead.updateMany({
      where: { id, companyId },
      data: { qualification, qualifiedAt },
    });

    if (result.count === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const eventUserId = actor.actor === 'user' ? actor.userId : undefined;

    if (qualification === 'QUALIFIED') {
      await writeEvent(companyId, 'LEAD_QUALIFIED', {
        leadId: id,
        userId: eventUserId,
        payload: { qualification },
      });
    } else if (qualification === 'DISQUALIFIED') {
      await writeEvent(companyId, 'LEAD_DISQUALIFIED', {
        leadId: id,
        userId: eventUserId,
        payload: { qualification },
      });
    } else {
      await writeEvent(companyId, 'LEAD_UPDATED', {
        leadId: id,
        userId: eventUserId,
        payload: { qualification: null },
      });
    }

    return Response.json({
      success: true,
      qualification,
      qualifiedAt: qualifiedAt ? qualifiedAt.toISOString() : null,
    });
  } catch (error) {
    console.error('[PATCH /api/leads/:id/qualification] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
