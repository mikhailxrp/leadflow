import type { Prisma } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateSettingsSchema } from '@/lib/validations/settings';

function asRecord(settings: unknown): Record<string, unknown> {
  return settings && typeof settings === 'object' && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)
    : {};
}

function withoutCursor(settings: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...settings };
  delete rest.roundRobinCursor;
  return rest;
}

export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { companyId } = session.user;

  try {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { settings: true },
    });

    return Response.json(withoutCursor(asRecord(company.settings)));
  } catch (error) {
    console.error('[GET /api/settings] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<Response> {
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

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { settings: true },
    });

    const current = asRecord(company.settings);
    const merged = { ...current, ...parsed.data };

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { settings: merged as Prisma.InputJsonValue },
      select: { settings: true },
    });

    return Response.json(withoutCursor(asRecord(updated.settings)));
  } catch (error) {
    console.error('[PATCH /api/settings] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
