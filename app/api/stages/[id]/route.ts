import type { Prisma } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  deleteStageSchema,
  updateStageSchema,
} from '@/lib/validations/stages';

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId } = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateStageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const existing = await prisma.pipelineStage.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const data: Prisma.PipelineStageUpdateInput = {};

    if ('name' in parsed.data) {
      data.name = parsed.data.name;
    }
    if ('color' in parsed.data) {
      data.color = parsed.data.color;
    }
    if ('stageTimeLimitDays' in parsed.data) {
      data.stageTimeLimitDays = parsed.data.stageTimeLimitDays;
    }

    const updated = await prisma.pipelineStage.update({
      where: { id, companyId },
      data,
      select: {
        ...STAGE_SELECT,
        _count: { select: { leads: true } },
      },
    });

    return Response.json(mapStageRow(updated));
  } catch (error) {
    console.error('[PATCH /api/stages/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId } = session.user;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      body = JSON.parse(text);
    }
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = deleteStageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const existing = await prisma.pipelineStage.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const stageCount = await prisma.pipelineStage.count({
      where: { companyId },
    });

    if (stageCount <= 1) {
      return Response.json({ error: 'LAST_STAGE' }, { status: 400 });
    }

    const leadsCount = await prisma.lead.count({
      where: { stageId: id, companyId },
    });

    const { moveToStageId } = parsed.data;

    if (leadsCount > 0 && !moveToStageId) {
      return Response.json({ error: 'MOVE_TARGET_REQUIRED' }, { status: 400 });
    }

    if (moveToStageId) {
      if (moveToStageId === id) {
        return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
      }

      const moveTarget = await prisma.pipelineStage.findFirst({
        where: { id: moveToStageId, companyId },
        select: { id: true },
      });

      if (!moveTarget) {
        return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      if (leadsCount > 0 && moveToStageId) {
        await tx.lead.updateMany({
          where: { stageId: id, companyId },
          data: { stageId: moveToStageId },
        });
      }

      await tx.pipelineStage.delete({
        where: { id, companyId },
      });
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/stages/:id] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
