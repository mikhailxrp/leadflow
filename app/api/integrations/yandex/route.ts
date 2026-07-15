import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { disconnectYandex, getYandexConnectionStatus } from '@/lib/integrations/yandex/oauth';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    const status = await getYandexConnectionStatus(actor.companyId);
    return Response.json(status);
  } catch (error) {
    console.error('[GET /api/integrations/yandex] failed:', error);
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
    await disconnectYandex(actor.companyId);
    await writeEvent(actor.companyId, 'YANDEX_DISCONNECTED', { userId: actor.userId });
    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/integrations/yandex] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
