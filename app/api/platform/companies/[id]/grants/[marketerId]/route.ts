import { writeEvent } from '@/lib/events';
import { requirePlatformSession } from '@/lib/platform/auth';
import { prisma } from '@/lib/prisma';
import { companyGrantParamsSchema } from '@/lib/validations/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; marketerId: string }> },
): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({ roles: ['SUPER_ADMIN'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const rawParams = await params;
  const parsedParams = companyGrantParamsSchema.safeParse({
    companyId: rawParams.id,
    marketerId: rawParams.marketerId,
  });
  if (!parsedParams.success) {
    return Response.json(
      { error: 'Validation failed', details: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const { companyId, marketerId } = parsedParams.data;

  try {
    const grant = await prisma.companyAccessGrant.findUnique({
      where: { companyId_platformAdminId: { companyId, platformAdminId: marketerId } },
      select: { id: true },
    });

    if (!grant) {
      return Response.json({ error: 'Grant not found' }, { status: 404 });
    }

    await prisma.companyAccessGrant.delete({ where: { id: grant.id } });

    await writeEvent(companyId, 'COMPANY_ACCESS_REVOKED', {
      payload: { marketerId, byPlatformAdminId: session.admin.id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke company grant:', error);
    return Response.json({ error: 'Failed to revoke grant' }, { status: 500 });
  }
}
