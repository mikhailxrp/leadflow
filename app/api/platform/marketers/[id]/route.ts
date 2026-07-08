import { requirePlatformSession } from '@/lib/platform/auth';
import { prisma } from '@/lib/prisma';
import {
  marketerParamsSchema,
  updateMarketerSchema,
} from '@/lib/validations/platform';
import { blockMarketer, unblockMarketer } from '@/lib/platform/cascadeBlock';
import { sendCascadeBlockEmail } from '@/lib/platform/sendCascadeBlockEmail';
import type { MarketerActivityItem } from '@/types/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function PATCH(
  request: Request,
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
  const parsedParams = marketerParamsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return Response.json(
      { error: 'Validation failed', details: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsedBody = updateMarketerSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      { error: 'Validation failed', details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = parsedParams.data;
  const { isActive } = parsedBody.data;

  const marketer = await prisma.platformAdmin.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });

  if (!marketer || marketer.role !== 'MARKETER' || marketer.deletedAt) {
    return Response.json({ error: 'Маркетолог не найден' }, { status: 404 });
  }

  try {
    if (!isActive) {
      const { companies, blockedAt } = await blockMarketer(
        id,
        session.admin.id,
      );

      if (companies.length > 0) {
        await sendCascadeBlockEmail({
          marketerName: marketer.name,
          marketerEmail: marketer.email,
          companies,
          blockedAt,
        });
      }
    } else {
      await unblockMarketer(id, session.admin.id);
    }

    const updated = await prisma.platformAdmin.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    const companiesCreated = await prisma.company.count({
      where: { createdByPlatformAdminId: id },
    });

    const item: MarketerActivityItem = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      companiesCreated,
    };

    return Response.json(item);
  } catch (error) {
    console.error('Failed to update marketer:', error);
    return Response.json(
      { error: 'Failed to update marketer' },
      { status: 500 },
    );
  }
}
