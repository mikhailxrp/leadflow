import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { createUserSchema } from '@/lib/validations/users';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isBlocked: true,
  createdAt: true,
} as const;

export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId } = session.user;

  try {
    const users = await prisma.user.findMany({
      where: { companyId },
      select: USER_PUBLIC_SELECT,
      orderBy: { name: 'asc' },
    });

    return Response.json(users);
  } catch (error) {
    console.error('[GET /api/users] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId } = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    // Глобальная проверка: User.email @unique без companyId.
    // Не добавлять companyId — иначе пропустим дубликат в другой компании и получим P2002.
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existingUser) {
      return Response.json({ error: 'EMAIL_EXISTS' }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const created = await prisma.user.create({
      data: {
        companyId,
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
      },
      select: USER_PUBLIC_SELECT,
    });

    await writeEvent(companyId, 'USER_CREATED', { userId: created.id });

    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/users] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
