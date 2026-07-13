import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { getSummary } from '@/lib/reports/getSummary';
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
      pathname: '/api/reports/summary',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { from, to } = resolveReportPeriod(parsed.data);

  try {
    const summary = await getSummary(actor.companyId, from, to);
    return Response.json(summary);
  } catch (error) {
    console.error('[GET /api/reports/summary] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
