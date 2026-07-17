import { verifyCronSecret } from '@/lib/cron/verifyCronSecret';
import { exportQualifiedLeads } from '@/lib/integrations/yandex/metrikaExport';
import { parseCompanySettings } from '@/lib/settings/getSettings';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type CronResult = {
  companiesProcessed: number;
  exported: number;
  skippedNoIdentifier: number;
  failedGroups: number;
};

async function handle(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const companies = await prisma.company.findMany({
      where: { isBlocked: false, metrikaAccessToken: { not: null } },
      select: { id: true, settings: true },
    });

    const result: CronResult = {
      companiesProcessed: 0,
      exported: 0,
      skippedNoIdentifier: 0,
      failedGroups: 0,
    };

    for (const company of companies) {
      const settings = parseCompanySettings(company.settings);
      if (!settings.yandexMetrika?.counterId || !settings.yandexMetrika?.qualifiedGoalId) continue;

      result.companiesProcessed += 1;

      const companyResult = await exportQualifiedLeads(company.id);
      result.exported += companyResult.exported;
      result.skippedNoIdentifier += companyResult.skippedNoIdentifier;
      result.failedGroups += companyResult.failedGroups;
    }

    return Response.json(result);
  } catch (error) {
    console.error('Failed to export Metrika qualifications:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
