import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import { createRestoreToken } from '@/lib/platform/impersonate';
import { endMarketerAccessBodySchema } from '@/lib/validations/platform';

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

    const parsedBody = endMarketerAccessBodySchema.safeParse(body);
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

  if (!session || session.kind !== 'company' || !session.marketer) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId, platformAdminId } = session.marketer;

  try {
    await writeEvent(companyId, 'MARKETER_ACCESS_ENDED', {
      payload: {
        companyId,
        platformAdminId,
      },
    });
  } catch (error) {
    console.error('Failed to write marketer access ended event:', error);
    return Response.json(
      { error: 'Failed to end marketer access' },
      { status: 500 },
    );
  }

  const restoreToken = createRestoreToken(platformAdminId);

  return Response.json({ token: restoreToken });
}
