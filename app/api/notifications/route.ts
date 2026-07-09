import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { getUserNotifications } from '@/lib/notifications/getUserNotifications';
import { notificationsQuerySchema } from '@/lib/validations/notifications';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = notificationsQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { userId, companyId } = actor;
  const { limit } = parsed.data;

  const result = await getUserNotifications(userId, companyId, limit);

  return Response.json(result);
}
