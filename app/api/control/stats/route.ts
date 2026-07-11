import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { getManagerStats } from '@/lib/control/getManagerStats';
import { controlPeriodSchema } from '@/lib/validations/control';
import type { ControlPeriodDays, ControlStatsResponse } from '@/types/control';

const MS_PER_DAY = 86_400_000;
const DEFAULT_PERIOD_DAYS = 30;

export async function GET(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireCompanyUser({ minRole: 'HEAD' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const rawPeriod = searchParams.get('period') ?? String(DEFAULT_PERIOD_DAYS);
  const parsedPeriod = controlPeriodSchema.safeParse(rawPeriod);

  if (!parsedPeriod.success) {
    return Response.json(
      { error: 'Validation failed', details: parsedPeriod.error.flatten() },
      { status: 400 },
    );
  }

  const periodDays = parsedPeriod.data as ControlPeriodDays;
  const periodStart = new Date(Date.now() - periodDays * MS_PER_DAY);

  try {
    const managers = await getManagerStats(user.companyId, periodStart);
    const response: ControlStatsResponse = { managers, periodDays };
    return Response.json(response);
  } catch (error) {
    console.error('[GET /api/control/stats] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
