import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import { createRestoreToken } from '@/lib/platform/impersonate';
import { endImpersonationBodySchema } from '@/lib/validations/platform';

export async function POST(request: Request): Promise<Response> {
  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  const hasBody = Number.isFinite(contentLength)
    ? contentLength > 0
    : Boolean(request.headers.get('transfer-encoding'));

  if (hasBody) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsedBody = endImpersonationBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }
  }

  const session = await auth();

  if (
    !session ||
    session.kind !== 'company' ||
    !session.user?.impersonatedByPlatformAdminId
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    companyId,
    id: userId,
    impersonatedByPlatformAdminId,
  } = session.user;

  try {
    await writeEvent(companyId, 'PLATFORM_IMPERSONATION_ENDED', {
      userId,
      payload: {
        companyId,
        userId,
        platformAdminId: impersonatedByPlatformAdminId,
      },
    });
  } catch (error) {
    console.error('Failed to write impersonation ended event:', error);
    return Response.json({ error: 'Failed to end impersonation' }, { status: 500 });
  }

  // Restore the platform admin session instead of fully signing out, so the
  // admin returns to the platform area rather than being logged out entirely.
  // The client consumes this token via signIn('platform-restore'), which
  // overwrites the company impersonation cookie with a platform session.
  const restoreToken = createRestoreToken(impersonatedByPlatformAdminId);

  return Response.json({ token: restoreToken });
}
