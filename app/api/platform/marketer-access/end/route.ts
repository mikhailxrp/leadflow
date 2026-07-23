import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import { createRestoreToken } from '@/lib/platform/impersonate';
import { prisma } from '@/lib/prisma';
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

  // Сеанс маркетолога — это impersonation-сессия компании, инициированная платформенным
  // пользователем с ролью MARKETER (суперадмин завершает свой вход через /impersonate/end).
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
    impersonatedByPlatformAdminId: platformAdminId,
  } = session.user;

  const initiator = await prisma.platformAdmin.findUnique({
    where: { id: platformAdminId },
    select: { role: true },
  });

  if (initiator?.role !== 'MARKETER') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await writeEvent(companyId, 'MARKETER_ACCESS_ENDED', {
      userId,
      payload: {
        companyId,
        userId,
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
