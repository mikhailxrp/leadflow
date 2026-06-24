import { createUserPasswordResetToken } from '@/lib/auth/passwordReset';
import { sendPasswordResetEmail } from '@/lib/auth/sendPasswordResetEmail';
import { checkRateLimit } from '@/lib/rateLimit';
import { forgotPasswordSchema } from '@/lib/validations/auth';

function getIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? (forwarded.split(',')[0]?.trim() || undefined) : undefined;
}

const GENERIC_SUCCESS_RESPONSE = {
  success: true,
  message:
    'Если аккаунт с таким email существует, мы отправили ссылку для восстановления.',
};

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const ip = getIp(request);
  const rateLimitKey = `${ip}:${parsed.data.email.toLowerCase()}`;
  if (!checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000)) {
    return Response.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 });
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error('APP_URL is not configured');
    return Response.json(GENERIC_SUCCESS_RESPONSE);
  }

  try {
    const tokenData = await createUserPasswordResetToken(parsed.data.email);
    if (tokenData) {
      const baseUrl = appUrl.replace(/\/$/, '');
      const resetUrl = `${baseUrl}/reset-password?token=${tokenData.token}`;
      await sendPasswordResetEmail({
        email: tokenData.email,
        resetUrl,
      });
    }

    return Response.json(GENERIC_SUCCESS_RESPONSE);
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return Response.json({ error: 'USER_NOT_FOUND' }, { status: 400 });
    }
    console.error('Failed to handle forgot password request:', error);
    return Response.json(GENERIC_SUCCESS_RESPONSE);
  }
}
