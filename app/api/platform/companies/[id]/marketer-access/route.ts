import { writeEvent } from '@/lib/events';
import { requirePlatformSession } from '@/lib/platform/auth';
import { visibilityWhere } from '@/lib/platform/companyVisibility';
import { createMarketerAccessToken } from '@/lib/platform/marketerAccess';
import { prisma } from '@/lib/prisma';
import { marketerAccessParamsSchema } from '@/lib/validations/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({ roles: ['MARKETER'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const rawParams = await params;
  const parsedParams = marketerAccessParamsSchema.safeParse({
    companyId: rawParams.id,
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

  const { companyId } = parsedParams.data;

  const company = await prisma.company.findFirst({
    where: { id: companyId, ...visibilityWhere(session.admin) },
    select: { id: true },
  });

  if (!company) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const token = createMarketerAccessToken({
    platformAdminId: session.admin.id,
    companyId,
  });

  try {
    await writeEvent(companyId, 'MARKETER_ACCESS_STARTED', {
      payload: {
        companyId,
        platformAdminId: session.admin.id,
      },
    });
  } catch (error) {
    console.error('Failed to write marketer access started event:', error);
    return Response.json(
      { error: 'Failed to start marketer access' },
      { status: 500 },
    );
  }

  return Response.json({ token });
}
