import { writeEvent } from '@/lib/events';
import { requirePlatformSession } from '@/lib/platform/auth';
import { canManageCompany, resolveOwnerRoles } from '@/lib/platform/companyVisibility';
import { getSubscriptionStatus } from '@/lib/platform/subscription';
import { prisma } from '@/lib/prisma';
import { patchCompanySchema } from '@/lib/validations/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

function parsePaymentDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({ roles: ['SUPER_ADMIN', 'MARKETER'] });
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

  const parsed = patchCompanySchema.safeParse(body);
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
    select: { id: true, createdByPlatformAdminId: true },
  });

  if (!existing) {
    return Response.json({ error: 'Company not found' }, { status: 404 });
  }

  const ownerRoles = await resolveOwnerRoles([existing.createdByPlatformAdminId]);
  const ownerRole = existing.createdByPlatformAdminId
    ? ownerRoles.get(existing.createdByPlatformAdminId)
    : undefined;

  if (!canManageCompany(session.admin, existing, ownerRole)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if ('isBlocked' in parsed.data) {
    const { isBlocked } = parsed.data;

    try {
      const company = await prisma.company.update({
        where: { id },
        data: { isBlocked, blockedByMarketerCascade: false },
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

  const nextPaymentAt =
    parsed.data.nextPaymentAt === null
      ? null
      : parsePaymentDate(parsed.data.nextPaymentAt);

  try {
    const company = await prisma.company.update({
      where: { id },
      data: { nextPaymentAt },
      select: {
        id: true,
        name: true,
        isBlocked: true,
        nextPaymentAt: true,
        createdAt: true,
      },
    });

    await writeEvent(id, 'COMPANY_PAYMENT_UPDATED', {
      payload: {
        nextPaymentAt: company.nextPaymentAt?.toISOString() ?? null,
        byPlatformAdminId: session.admin.id,
      },
    });

    const subscriptionStatus = getSubscriptionStatus(company.nextPaymentAt);

    return Response.json({
      id: company.id,
      name: company.name,
      isBlocked: company.isBlocked,
      createdAt: company.createdAt.toISOString(),
      nextPaymentAt: company.nextPaymentAt?.toISOString() ?? null,
      subscriptionStatus: subscriptionStatus.status,
    });
  } catch (error) {
    console.error('Failed to update company payment date:', error);
    return Response.json({ error: 'Failed to update company' }, { status: 500 });
  }
}
