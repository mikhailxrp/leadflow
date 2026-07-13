import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { getLossReasonsBreakdown } from '@/lib/reports/getLossReasonsBreakdown';
import { reportPeriodSchema, resolveReportPeriod } from '@/lib/validations/reports';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = reportPeriodSchema.safeParse({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'HEAD',
      method: 'GET',
      pathname: '/api/reports/loss-reasons',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { from, to } = resolveReportPeriod(parsed.data);

  try {
    const lossReasons = await getLossReasonsBreakdown(actor.companyId, from, to);
    return Response.json(lossReasons);
  } catch (error) {
    console.error('[GET /api/reports/loss-reasons] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
