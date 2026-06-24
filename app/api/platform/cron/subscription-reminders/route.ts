import { sendSubscriptionDigest } from '@/lib/platform/subscriptionReminders';
import { cronSubscriptionAuthSchema } from '@/lib/validations/platform';

export const dynamic = 'force-dynamic';

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authParse = cronSubscriptionAuthSchema.safeParse({
    authorization: request.headers.get('authorization') ?? undefined,
    xCronSecret: request.headers.get('x-cron-secret') ?? undefined,
    key: new URL(request.url).searchParams.get('key') ?? undefined,
  });

  if (!authParse.success) {
    return false;
  }

  const { authorization, xCronSecret, key } = authParse.data;

  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length);
    if (token === secret) {
      return true;
    }
  }

  if (xCronSecret === secret) {
    return true;
  }

  if (key === secret) {
    return true;
  }

  return false;
}

async function handle(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendSubscriptionDigest();
    return Response.json(result);
  } catch (error) {
    console.error('Failed to send subscription digest:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
