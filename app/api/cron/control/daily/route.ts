import { checkEndOfDaySummary } from '@/lib/control/checkEndOfDaySummary';
import { checkStuckLeads } from '@/lib/control/checkStuckLeads';
import { verifyCronSecret } from '@/lib/cron/verifyCronSecret';

export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stuckLeads, endOfDaySummary] = await Promise.allSettled([
    checkStuckLeads(),
    checkEndOfDaySummary(),
  ]);

  if (stuckLeads.status === 'rejected') {
    console.error('Failed to check stuck leads:', stuckLeads.reason);
  }
  if (endOfDaySummary.status === 'rejected') {
    console.error('Failed to check end-of-day summary:', endOfDaySummary.reason);
  }

  const hasFailure = stuckLeads.status === 'rejected' || endOfDaySummary.status === 'rejected';

  return Response.json(
    {
      stuckLeads: stuckLeads.status === 'fulfilled' ? stuckLeads.value : null,
      endOfDaySummary: endOfDaySummary.status === 'fulfilled' ? endOfDaySummary.value : null,
    },
    { status: hasFailure ? 500 : 200 },
  );
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
