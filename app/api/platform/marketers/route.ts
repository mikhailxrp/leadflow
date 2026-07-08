import { requirePlatformSession } from '@/lib/platform/auth';
import { hashPassword } from '@/lib/password';
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
        isActive: true,
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
      isActive: marketer.isActive,
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

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const normalizedEmail = parsed.data.email.toLowerCase().trim();
    const trimmedName = parsed.data.name.trim();

    const existing = await prisma.platformAdmin.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, isActive: true, deletedAt: true },
    });

    if (existing && existing.isActive && !existing.deletedAt) {
      return Response.json(
        { error: 'Маркетолог с таким email уже существует' },
        { status: 409 },
      );
    }

    if (existing) {
      const restored = await prisma.platformAdmin.update({
        where: { id: existing.id },
        data: {
          name: trimmedName,
          passwordHash,
          role: 'MARKETER',
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
        },
      });

      const item: MarketerActivityItem = {
        id: restored.id,
        name: restored.name,
        email: restored.email,
        isActive: restored.isActive,
        lastLoginAt: restored.lastLoginAt?.toISOString() ?? null,
        companiesCreated: 0,
      };

      return Response.json(item, { status: 201 });
    }

    const marketer = await prisma.platformAdmin.create({
      data: {
        email: normalizedEmail,
        name: trimmedName,
        passwordHash,
        role: 'MARKETER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    const item: MarketerActivityItem = {
      id: marketer.id,
      name: marketer.name,
      email: marketer.email,
      isActive: marketer.isActive,
      lastLoginAt: marketer.lastLoginAt?.toISOString() ?? null,
      companiesCreated: 0,
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
