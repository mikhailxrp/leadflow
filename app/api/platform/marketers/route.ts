import { requirePlatformSession } from '@/lib/platform/auth';
import { issueMarketerInvite } from '@/lib/platform/marketerInvite';
import { sendMarketerInviteEmail } from '@/lib/platform/sendMarketerInviteEmail';
import { prisma } from '@/lib/prisma';
import { createMarketerSchema } from '@/lib/validations/platform';
import type { MarketerActivityItem } from '@/types/platform';
import { Prisma } from '@prisma/client';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function GET(): Promise<Response> {
  try {
    await requirePlatformSession({ roles: ['SUPER_ADMIN'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  try {
    const marketers = await prisma.platformAdmin.findMany({
      where: { role: 'MARKETER', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        passwordHash: true,
        lastLoginAt: true,
      },
    });

    const companiesCreatedCounts = await prisma.company.groupBy({
      by: ['createdByPlatformAdminId'],
      where: {
        createdByPlatformAdminId: { in: marketers.map((marketer) => marketer.id) },
      },
      _count: { _all: true },
    });

    const companiesCreatedByMarketerId = new Map(
      companiesCreatedCounts.map((row) => [
        row.createdByPlatformAdminId,
        row._count._all,
      ]),
    );

    const items: MarketerActivityItem[] = marketers.map((marketer) => ({
      id: marketer.id,
      name: marketer.name,
      email: marketer.email,
      phone: marketer.phone,
      isActive: marketer.isActive,
      invitePending: marketer.passwordHash === null,
      lastLoginAt: marketer.lastLoginAt?.toISOString() ?? null,
      companiesCreated: companiesCreatedByMarketerId.get(marketer.id) ?? 0,
    }));

    return Response.json(items);
  } catch (error) {
    console.error('Failed to fetch marketers:', error);
    return Response.json(
      { error: 'Failed to fetch marketers' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requirePlatformSession({ roles: ['SUPER_ADMIN'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createMarketerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error('APP_URL is not configured');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const marketerSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    isActive: true,
    lastLoginAt: true,
  } as const;

  try {
    const normalizedEmail = parsed.data.email.toLowerCase().trim();
    const trimmedName = parsed.data.name.trim();
    const trimmedPhone = parsed.data.phone.trim();

    const existing = await prisma.platformAdmin.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, isActive: true, deletedAt: true, passwordHash: true },
    });

    // Уже существующий, активный и подтверждённый маркетолог — конфликт.
    // Приглашённого (passwordHash === null) или заблокированного/удалённого
    // переприглашаем: сбрасываем в pending и выпускаем новую ссылку.
    if (
      existing &&
      existing.isActive &&
      !existing.deletedAt &&
      existing.passwordHash
    ) {
      return Response.json(
        { error: 'Маркетолог с таким email уже существует' },
        { status: 409 },
      );
    }

    const { marketer, token } = await prisma.$transaction(async (tx) => {
      const admin = existing
        ? await tx.platformAdmin.update({
            where: { id: existing.id },
            data: {
              name: trimmedName,
              phone: trimmedPhone,
              passwordHash: null,
              role: 'MARKETER',
              isActive: true,
              deletedAt: null,
            },
            select: marketerSelect,
          })
        : await tx.platformAdmin.create({
            data: {
              email: normalizedEmail,
              name: trimmedName,
              phone: trimmedPhone,
              role: 'MARKETER',
            },
            select: marketerSelect,
          });

      const inviteToken = await issueMarketerInvite(tx, admin.id);
      return { marketer: admin, token: inviteToken };
    });

    const companiesCreated = existing
      ? await prisma.company.count({
          where: { createdByPlatformAdminId: marketer.id },
        })
      : 0;

    const baseUrl = appUrl.replace(/\/$/, '');
    const inviteUrl = `${baseUrl}/platform/accept-invite?token=${token}`;

    // Best-effort: ошибка письма не отменяет создание, ссылка возвращается
    // для показа суперадмину в модальном окне.
    try {
      await sendMarketerInviteEmail({ email: marketer.email, inviteUrl });
    } catch (emailError) {
      console.error('Failed to send marketer invite email:', emailError);
    }

    const item: MarketerActivityItem & { inviteUrl: string } = {
      id: marketer.id,
      name: marketer.name,
      email: marketer.email,
      phone: marketer.phone,
      isActive: marketer.isActive,
      invitePending: true,
      lastLoginAt: marketer.lastLoginAt?.toISOString() ?? null,
      companiesCreated,
      inviteUrl,
    };

    return Response.json(item, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return Response.json(
        { error: 'Маркетолог с таким email уже существует' },
        { status: 409 },
      );
    }

    console.error('Failed to create marketer:', error);
    return Response.json(
      { error: 'Failed to create marketer' },
      { status: 500 },
    );
  }
}
