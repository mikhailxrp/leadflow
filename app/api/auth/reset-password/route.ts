import { resetUserPassword } from '@/lib/auth/passwordReset';
import { checkRateLimit } from '@/lib/rateLimit';
import { resetPasswordSchema } from '@/lib/validations/auth';

function getIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? (forwarded.split(',')[0]?.trim() || undefined) : undefined;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const ip = getIp(request);
  if (!checkRateLimit(ip, 10, 60 * 60 * 1000)) {
    return Response.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 });
  }

  try {
    await resetUserPassword(parsed.data.token, parsed.data.password);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === 'TOKEN_INVALID' ||
        error.message === 'TOKEN_EXPIRED' ||
        error.message === 'TOKEN_USED'
      ) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Failed to reset password:', error);
    return Response.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
