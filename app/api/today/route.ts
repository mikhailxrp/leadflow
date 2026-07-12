import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { getTodayData } from '@/lib/today/getTodayData';

export async function GET(): Promise<Response> {
  let user;
  try {
    user = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    const data = await getTodayData(user.companyId, user.userId);
    return Response.json(data);
  } catch (error) {
    console.error('[GET /api/today] getTodayData failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
