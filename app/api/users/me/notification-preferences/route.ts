import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { parseNotificationPreferences } from '@/lib/notifications/preferences';
import { prisma } from '@/lib/prisma';
import { updateNotificationPreferencesSchema } from '@/lib/validations/users';
import type { NotificationPreferences } from '@/types/users';

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

  const parsedBody = updateNotificationPreferencesSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      { error: 'Validation failed', details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: actor.userId },
      select: { notificationPreferences: true },
    });

    const merged: NotificationPreferences = {
      ...parseNotificationPreferences(current.notificationPreferences),
      ...parsedBody.data,
    };

    await prisma.user.update({
      where: { id: actor.userId },
      data: { notificationPreferences: merged },
    });

    return Response.json(merged);
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return Response.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 },
    );
  }
}
