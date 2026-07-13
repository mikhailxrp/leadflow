import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';
import { updateApiKeySchema } from '@/lib/validations/apiKeys';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'ADMIN',
      method: 'PATCH',
      pathname: `/api/api-keys/${id}`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const existing = await prisma.apiKey.findFirst({
      where: { id, companyId: actor.companyId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: { isEnabled: parsed.data.isEnabled },
      select: { id: true, isEnabled: true },
    });

    return Response.json(updated);
  } catch (error) {
    console.error('[PATCH /api/api-keys/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'ADMIN',
      method: 'DELETE',
      pathname: `/api/api-keys/${id}`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    const existing = await prisma.apiKey.findFirst({
      where: { id, companyId: actor.companyId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id, companyId: actor.companyId } });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/api-keys/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
