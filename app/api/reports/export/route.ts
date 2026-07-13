import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { getBySource } from '@/lib/reports/getBySource';
import { getLossReasonsBreakdown } from '@/lib/reports/getLossReasonsBreakdown';
import { getSummary } from '@/lib/reports/getSummary';
import { getManagerStats } from '@/lib/control/getManagerStats';
import {
  byEmployeeToCsv,
  bySourceToCsv,
  lossReasonsToCsv,
  summaryToCsv,
} from '@/lib/reports/exportToCsv';
import {
  reportExportNameSchema,
  reportPeriodSchema,
  resolveReportPeriod,
} from '@/lib/validations/reports';

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const parsedReport = reportExportNameSchema.safeParse(searchParams.get('report'));
  if (!parsedReport.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsedPeriod = reportPeriodSchema.safeParse({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });
  if (!parsedPeriod.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'HEAD',
      method: 'GET',
      pathname: '/api/reports/export',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const report = parsedReport.data;
  const { from, to } = resolveReportPeriod(parsedPeriod.data);

  try {
    let csv: string;
    switch (report) {
      case 'summary':
        csv = summaryToCsv(await getSummary(actor.companyId, from, to));
        break;
      case 'loss-reasons':
        csv = lossReasonsToCsv(await getLossReasonsBreakdown(actor.companyId, from, to));
        break;
      case 'by-employee':
        csv = byEmployeeToCsv(await getManagerStats(actor.companyId, from, to));
        break;
      case 'by-source':
        csv = bySourceToCsv(await getBySource(actor.companyId, from, to));
        break;
    }

    const filename = `${report}-${toDayKey(from)}_${toDayKey(to)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[GET /api/reports/export] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
