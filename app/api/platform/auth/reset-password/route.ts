import { resetPlatformAdminPassword } from '@/lib/platform/passwordReset';
import { platformResetPasswordSchema } from '@/lib/validations/platform';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = platformResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const resetApplied = await resetPlatformAdminPassword(
      parsed.data.token,
      parsed.data.password,
    );

    if (!resetApplied) {
      return Response.json(
        { error: 'Недействительный или просроченный токен' },
        { status: 400 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to reset platform admin password:', error);
    return Response.json(
      { error: 'Failed to reset password' },
      { status: 500 },
    );
  }
}
