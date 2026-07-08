import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createStageSchema } from '@/lib/validations/stages';

const STAGE_SELECT = {
  id: true,
  name: true,
  color: true,
  order: true,
  stageTimeLimitDays: true,
} as const;

type StageRow = {
  id: string;
  name: string;
  color: string;
  order: number;
  stageTimeLimitDays: number | null;
  _count: { leads: number };
};

function mapStageRow({ _count, ...rest }: StageRow) {
  return {
    ...rest,
    leadsCount: _count.leads,
  };
}

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
    const stages = await prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: {
        ...STAGE_SELECT,
        _count: { select: { leads: true } },
      },
    });

    return Response.json(stages.map(mapStageRow));
  } catch (error) {
    console.error('[GET /api/stages] failed:', error);
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

  const parsed = createStageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const maxOrderResult = await prisma.pipelineStage.aggregate({
      where: { companyId },
      _max: { order: true },
    });

    const order = (maxOrderResult._max.order ?? -1) + 1;

    const created = await prisma.pipelineStage.create({
      data: {
        companyId,
        name: parsed.data.name,
        color: parsed.data.color,
        order,
        stageTimeLimitDays: parsed.data.stageTimeLimitDays ?? null,
      },
      select: STAGE_SELECT,
    });

    return Response.json({ ...created, leadsCount: 0 }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/stages] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
