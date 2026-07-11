import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { getSettings } from '@/lib/settings/getSettings';
import { updateSettings } from '@/lib/settings/updateSettings';
import { updateSettingsSchema } from '@/lib/validations/settings';

export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = session.user;

  try {
    return Response.json(await getSettings(companyId));
  } catch (error) {
    console.error('[GET /api/settings] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId } = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    return Response.json(await updateSettings(companyId, parsed.data));
  } catch (error) {
    console.error('[PATCH /api/settings] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
