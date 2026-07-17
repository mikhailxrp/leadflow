import { requireCompanyAccess, requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import {
  disconnectMetrika,
  getMetrikaConnectionStatus,
  saveMetrikaSettings,
} from '@/lib/integrations/yandex/metrikaOauth';
import { metrikaSettingsSchema } from '@/lib/validations/yandex';

const PATH = '/api/integrations/yandex/metrika';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    const status = await getMetrikaConnectionStatus(actor.companyId);
    return Response.json(status);
  } catch (error) {
    console.error('[GET /api/integrations/yandex/metrika] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyAccess({ minRole: 'ADMIN', method: 'PATCH', pathname: PATH });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = metrikaSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await saveMetrikaSettings(actor.companyId, parsed.data);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/integrations/yandex/metrika] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    await disconnectMetrika(actor.companyId);
    await writeEvent(actor.companyId, 'METRIKA_DISCONNECTED', { userId: actor.userId });
    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/integrations/yandex/metrika] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
