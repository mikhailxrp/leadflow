import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { userId, companyId } = actor;

  const result = await prisma.notification.updateMany({
    where: { id, userId, companyId },
    data: { readAt: new Date() },
  });

  if (result.count === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
