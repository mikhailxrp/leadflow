import { writeEvent } from '@/lib/events';
import { requirePlatformSession } from '@/lib/platform/auth';
import { canManageCompany, resolveOwnerRoles } from '@/lib/platform/companyVisibility';
import { cleanupCompanyAssets } from '@/lib/platform/cleanupCompanyAssets';
import { deleteCompanyData } from '@/lib/platform/deleteCompany';
import { sendCompanyDeletedEmail } from '@/lib/platform/sendCompanyDeletedEmail';
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

export async function DELETE(
  _request: Request,
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

  const existing = await prisma.company.findUnique({
    where: { id },
    select: { id: true, isBlocked: true, createdByPlatformAdminId: true },
  });

  if (!existing) {
    return Response.json({ error: 'Company not found' }, { status: 404 });
  }

  // Удаление зеркалит блокировку по владению: суперадмин — только платформенные
  // компании, маркетолог — только свои (canManageCompany). Суперадмин НЕ удаляет
  // компанию маркетолога, как и не блокирует её.
  const ownerRoles = await resolveOwnerRoles([existing.createdByPlatformAdminId]);
  const ownerRole = existing.createdByPlatformAdminId
    ? ownerRoles.get(existing.createdByPlatformAdminId)
    : undefined;

  if (!canManageCompany(session.admin, existing, ownerRole)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Удалить можно только заблокированную компанию — намеренный предохранитель.
  if (!existing.isBlocked) {
    return Response.json({ error: 'COMPANY_NOT_BLOCKED' }, { status: 409 });
  }

  try {
    const info = await deleteCompanyData(id);

    // Письмо с контактами админов и очистка S3 — после успешного коммита; их сбой
    // не откатывает уже выполненное удаление данных.
    await sendCompanyDeletedEmail({
      companyName: info.companyName,
      admins: info.admins,
      deletedByEmail: session.admin.email,
      deletedAt: new Date(),
    }).catch((error) => {
      console.error('Failed to send company deleted email:', error);
    });

    await cleanupCompanyAssets(info.assetUrls);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete company:', error);
    return Response.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
