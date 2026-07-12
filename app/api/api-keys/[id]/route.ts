import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';

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
