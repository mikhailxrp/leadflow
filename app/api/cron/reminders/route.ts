import { verifyCronSecret } from '@/lib/cron/verifyCronSecret';
import { processReminders } from '@/lib/reminders/processReminders';

export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processReminders();
    return Response.json(result);
  } catch (error) {
    console.error('Failed to process reminders:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
