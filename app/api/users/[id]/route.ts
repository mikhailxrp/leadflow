import type { UserRole } from '@prisma/client';
import { hasMinRole, ROLE_RANK } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import {
  hasDependentRecords,
  isLastActiveAdmin,
} from '@/lib/users/userGuards';
import { updateUserSchema } from '@/lib/validations/users';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isBlocked: true,
  createdAt: true,
} as const;

function isRoleDemotion(currentRole: UserRole, newRole: UserRole): boolean {
  return ROLE_RANK[newRole] < ROLE_RANK[currentRole];
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId, id: sessionUserId } = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const target = await prisma.user.findFirst({
      where: { id, companyId },
      select: { id: true, role: true, isBlocked: true },
    });

    if (!target) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const isSelf = id === sessionUserId;
    const willBlock =
      parsed.data.isBlocked === true && target.isBlocked === false;
    const willDemote =
      parsed.data.role !== undefined &&
      isRoleDemotion(target.role, parsed.data.role);

    if (isSelf && (willBlock || willDemote)) {
      return Response.json({ error: 'LAST_ADMIN' }, { status: 409 });
    }

    if (willBlock && (await isLastActiveAdmin(companyId, id))) {
      return Response.json({ error: 'LAST_ADMIN' }, { status: 409 });
    }

    if (willDemote && (await isLastActiveAdmin(companyId, id))) {
      return Response.json({ error: 'LAST_ADMIN' }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id, companyId },
      data: {
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.isBlocked !== undefined
          ? { isBlocked: parsed.data.isBlocked }
          : {}),
      },
      select: USER_PUBLIC_SELECT,
    });

    if (
      parsed.data.isBlocked !== undefined &&
      parsed.data.isBlocked !== target.isBlocked
    ) {
      await writeEvent(
        companyId,
        parsed.data.isBlocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
        { userId: id },
      );
    }

    return Response.json(updated);
  } catch (error) {
    console.error('[PATCH /api/users/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId, id: sessionUserId } = session.user;

  if (id === sessionUserId) {
    return Response.json({ error: 'LAST_ADMIN' }, { status: 409 });
  }

  try {
    const target = await prisma.user.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!target) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (await isLastActiveAdmin(companyId, id)) {
      return Response.json({ error: 'LAST_ADMIN' }, { status: 409 });
    }

    if (await hasDependentRecords(id)) {
      return Response.json({ error: 'USER_HAS_DATA' }, { status: 409 });
    }

    await prisma.user.delete({
      where: { id, companyId },
    });

    await writeEvent(companyId, 'USER_DELETED', { userId: id });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/users/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
