import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLossReasonSchema } from '@/lib/validations/lossReasons';

const LOSS_REASON_SELECT = {
  id: true,
  label: true,
  order: true,
} as const;

export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { companyId } = session.user;

  try {
    const lossReasons = await prisma.lossReason.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: { id: true, label: true },
    });

    return Response.json(lossReasons);
  } catch (error) {
    console.error('[GET /api/loss-reasons] failed:', error);
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

  const parsed = createLossReasonSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const maxOrderResult = await prisma.lossReason.aggregate({
      where: { companyId },
      _max: { order: true },
    });

    const order = (maxOrderResult._max.order ?? -1) + 1;

    const created = await prisma.lossReason.create({
      data: {
        companyId,
        label: parsed.data.label,
        order,
      },
      select: LOSS_REASON_SELECT,
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error('[POST /api/loss-reasons] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
