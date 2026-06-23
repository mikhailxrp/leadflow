import { writeEvent } from '@/lib/events';
import { requirePlatformSession } from '@/lib/platform/auth';
import { prisma } from '@/lib/prisma';
import { blockCompanySchema } from '@/lib/validations/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = blockCompanySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const existing = await prisma.company.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return Response.json({ error: 'Company not found' }, { status: 404 });
  }

  const { isBlocked } = parsed.data;

  try {
    const company = await prisma.company.update({
      where: { id },
      data: { isBlocked },
      select: {
        id: true,
        name: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    await writeEvent(id, isBlocked ? 'COMPANY_BLOCKED' : 'COMPANY_UNBLOCKED', {
      payload: { byPlatformAdminId: session.admin.id },
    });

    return Response.json(company);
  } catch (error) {
    console.error('Failed to update company block status:', error);
    return Response.json({ error: 'Failed to update company' }, { status: 500 });
  }
}
