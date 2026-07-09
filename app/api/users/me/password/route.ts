import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { comparePassword, hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { changeOwnPasswordSchema } from '@/lib/validations/users';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function PATCH(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsedBody = changeOwnPasswordSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      { error: 'Validation failed', details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsedBody.data;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: { passwordHash: true },
  });

  const isCurrentPasswordValid = await comparePassword(
    currentPassword,
    user.passwordHash,
  );
  if (!isCurrentPasswordValid) {
    return Response.json(
      { error: 'INVALID_CURRENT_PASSWORD' },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: actor.userId },
      data: { passwordHash },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to change own password:', error);
    return Response.json(
      { error: 'Failed to change password' },
      { status: 500 },
    );
  }
}
