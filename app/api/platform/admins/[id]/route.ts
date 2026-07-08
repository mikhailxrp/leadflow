import { requirePlatformSession } from '@/lib/platform/auth';
import { prisma } from '@/lib/prisma';
import { platformAdminParamsSchema } from '@/lib/validations/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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
  const parsedParams = platformAdminParamsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsedParams.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { id } = parsedParams.data;

  if (id === session.admin.id) {
    return Response.json(
      { error: 'Нельзя удалить текущего администратора' },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.platformAdmin.findUnique({
        where: { id },
        select: { id: true, isActive: true, deletedAt: true },
      });

      if (!target || !target.isActive || target.deletedAt) {
        return { status: 'not_found' as const };
      }

      const activeCount = await tx.platformAdmin.count({
        where: {
          isActive: true,
          deletedAt: null,
        },
      });

      if (activeCount <= 1) {
        return { status: 'last_admin' as const };
      }

      await tx.platformAdmin.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      return { status: 'ok' as const };
    });

    if (result.status === 'not_found') {
      return Response.json({ error: 'Администратор не найден' }, { status: 404 });
    }

    if (result.status === 'last_admin') {
      return Response.json(
        { error: 'Нельзя удалить последнего активного администратора' },
        { status: 400 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete platform admin:', error);
    return Response.json(
      { error: 'Failed to delete platform admin' },
      { status: 500 },
    );
  }
}
