import { cookies } from 'next/headers';
import { auth, signOut } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import { endImpersonationBodySchema } from '@/lib/validations/platform';

const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  '__Host-authjs.session-token',
] as const;

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

  try {
    await signOut({ redirect: false });
  } catch {
    // signOut may throw NEXT_REDIRECT in Route Handlers — cookies cleared below
  }

  const cookieStore = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    cookieStore.delete(name);
  }

  return Response.json({ ok: true });
}
