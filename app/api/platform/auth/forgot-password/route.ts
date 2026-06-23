import { createPlatformPasswordResetToken } from '@/lib/platform/passwordReset';
import { sendPlatformPasswordResetEmail } from '@/lib/platform/sendPasswordResetEmail';
import { platformForgotPasswordSchema } from '@/lib/validations/platform';

const GENERIC_SUCCESS_RESPONSE = {
  success: true,
  message:
    'Если администратор с таким email существует, мы отправили ссылку для восстановления.',
};

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = platformForgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error('APP_URL is not configured');
    return Response.json(GENERIC_SUCCESS_RESPONSE);
  }

  try {
    const tokenData = await createPlatformPasswordResetToken(parsed.data.email);
    if (tokenData) {
      const baseUrl = appUrl.replace(/\/$/, '');
      const resetUrl = `${baseUrl}/platform/reset-password?token=${tokenData.token}`;
      await sendPlatformPasswordResetEmail({
        email: tokenData.email,
        resetUrl,
      });
    }

    return Response.json(GENERIC_SUCCESS_RESPONSE);
  } catch (error) {
    console.error('Failed to handle platform forgot password request:', error);
    return Response.json(GENERIC_SUCCESS_RESPONSE);
  }
}
