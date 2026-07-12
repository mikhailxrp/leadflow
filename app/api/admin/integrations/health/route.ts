import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { getSourceHealth } from '@/lib/integrations/getSourceHealth';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'ADMIN',
      method: 'GET',
      pathname: '/api/admin/integrations/health',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    const health = await getSourceHealth(actor.companyId);
    return Response.json(health);
  } catch (error) {
    console.error('[GET /api/admin/integrations/health] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
