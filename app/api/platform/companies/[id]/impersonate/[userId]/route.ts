import { writeEvent } from '@/lib/events';
import { createImpersonationToken } from '@/lib/platform/impersonate';
import { requirePlatformSession } from '@/lib/platform/auth';
import { prisma } from '@/lib/prisma';
import { impersonateUserParamsSchema } from '@/lib/validations/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession();
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const rawParams = await params;
  const parsedParams = impersonateUserParamsSchema.safeParse({
    companyId: rawParams.id,
    userId: rawParams.userId,
  });
  if (!parsedParams.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsedParams.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { companyId, userId } = parsedParams.data;

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const token = createImpersonationToken({
    userId,
    companyId,
    platformAdminId: session.admin.id,
  });

  try {
    await writeEvent(companyId, 'PLATFORM_IMPERSONATION_STARTED', {
      userId,
      payload: {
        companyId,
        userId,
        platformAdminId: session.admin.id,
      },
    });
  } catch (error) {
    console.error('Failed to write impersonation started event:', error);
    return Response.json({ error: 'Failed to start impersonation' }, { status: 500 });
  }

  return Response.json({ token });
}
