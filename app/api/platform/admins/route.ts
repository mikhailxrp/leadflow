import { requirePlatformSession } from '@/lib/platform/auth';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { createPlatformAdminSchema } from '@/lib/validations/platform';
import type { PlatformAdminListItem } from '@/types/platform';
import { Prisma } from '@prisma/client';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

function toListItem(admin: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}): PlatformAdminListItem {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    createdAt: admin.createdAt.toISOString(),
  };
}

export async function GET(): Promise<Response> {
  try {
    await requirePlatformSession();
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  try {
    const admins = await prisma.platformAdmin.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return Response.json(admins.map(toListItem));
  } catch (error) {
    console.error('Failed to fetch platform admins:', error);
    return Response.json(
      { error: 'Failed to fetch platform admins' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requirePlatformSession();
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

  const parsed = createPlatformAdminSchema.safeParse(body);
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
    const admin = await prisma.platformAdmin.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return Response.json(toListItem(admin), { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return Response.json(
        { error: 'Администратор с таким email уже существует' },
        { status: 400 },
      );
    }

    console.error('Failed to create platform admin:', error);
    return Response.json(
      { error: 'Failed to create platform admin' },
      { status: 500 },
    );
  }
}
