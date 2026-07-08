import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { reorderStagesSchema } from '@/lib/validations/stages';

function isSameIdSet(existingIds: Set<string>, orderedIds: string[]): boolean {
  if (existingIds.size !== orderedIds.length) {
    return false;
  }

  if (new Set(orderedIds).size !== orderedIds.length) {
    return false;
  }

  return orderedIds.every((stageId) => existingIds.has(stageId));
}

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

  const parsed = reorderStagesSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { orderedIds } = parsed.data;

  try {
    const existing = await prisma.pipelineStage.findMany({
      where: { companyId },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((stage) => stage.id));

    if (!isSameIdSet(existingIds, orderedIds)) {
      return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((stageId, index) =>
        prisma.pipelineStage.update({
          where: { id: stageId, companyId },
          data: { order: index },
        }),
      ),
    );

    const reordered = await prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        stageTimeLimitDays: true,
        _count: { select: { leads: true } },
      },
    });

    return Response.json(reordered.map(mapStageRow));
  } catch (error) {
    console.error('[PATCH /api/stages/reorder] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
