import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';
import { toUserProfileDetail, USER_PROFILE_SELECT } from '@/lib/users/profile';
import { updateOwnProfileSchema } from '@/lib/validations/users';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function GET(): Promise<Response> {
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

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: USER_PROFILE_SELECT,
  });

  return Response.json(toUserProfileDetail(user));
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

  const parsedBody = updateOwnProfileSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      { error: 'Validation failed', details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { name, phone, telegram, max, otherContact } = parsedBody.data;

  try {
    const updated = await prisma.user.update({
      where: { id: actor.userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(telegram !== undefined
          ? { telegram: telegram?.trim() || null }
          : {}),
        ...(max !== undefined ? { max: max?.trim() || null } : {}),
        ...(otherContact !== undefined
          ? { otherContact: otherContact?.trim() || null }
          : {}),
      },
      select: USER_PROFILE_SELECT,
    });

    return Response.json(toUserProfileDetail(updated));
  } catch (error) {
    console.error('Failed to update own profile:', error);
    return Response.json(
      { error: 'Failed to update profile' },
      { status: 500 },
    );
  }
}
