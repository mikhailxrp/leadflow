import { acceptInvite } from '@/lib/auth/acceptInvite';
import { acceptInviteSchema } from '@/lib/validations/auth';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  try {
    await acceptInvite(parsed.data);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVITE_INVALID') {
        return Response.json(
          { success: false, error: 'INVITE_INVALID' },
          { status: 400 },
        );
      }
      if (error.message === 'EMAIL_EXISTS') {
        return Response.json(
          { success: false, error: 'EMAIL_EXISTS' },
          { status: 400 },
        );
      }
    }

    console.error('Failed to accept invite:', error);
    return Response.json({ success: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
