import { acceptMarketerInvite } from '@/lib/platform/marketerInvite';
import { checkRateLimit } from '@/lib/rateLimit';
import { acceptMarketerInviteSchema } from '@/lib/validations/platform';

function getIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? (forwarded.split(',')[0]?.trim() || undefined) : undefined;
}

export async function POST(request: Request): Promise<Response> {
  const ip = getIp(request);
  if (!checkRateLimit(ip, 10, 60 * 60 * 1000)) {
    return Response.json(
      { success: false, error: 'TOO_MANY_REQUESTS' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  const parsed = acceptMarketerInviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  try {
    await acceptMarketerInvite(parsed.data);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITE_INVALID') {
      return Response.json(
        { success: false, error: 'INVITE_INVALID' },
        { status: 400 },
      );
    }

    console.error('Failed to accept marketer invite:', error);
    return Response.json(
      { success: false, error: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
