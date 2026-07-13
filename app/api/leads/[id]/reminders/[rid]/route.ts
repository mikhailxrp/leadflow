import type { Prisma, UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { updateReminderSchema } from '@/lib/validations/reminders';

const REMINDER_SELECT = {
  id: true,
  text: true,
  remindAt: true,
  channels: true,
  status: true,
  firedAt: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ReminderSelect;

async function findOwnedReminder(
  rid: string,
  leadId: string,
  companyId: string,
  role: UserRole,
  userId: string,
) {
  const visibility = visibilityWhere(role, userId);
  return prisma.reminder.findFirst({
    where: {
      id: rid,
      leadId,
      companyId,
      lead: Object.keys(visibility).length > 0 ? visibility : undefined,
    },
    select: { id: true, leadId: true, status: true, createdById: true },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; rid: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id, rid } = await params;
  const { companyId, userId, role } = actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const reminder = await findOwnedReminder(rid, id, companyId, role, userId);
    if (!reminder) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (reminder.status !== 'PENDING') {
      return Response.json({ error: 'REMINDER_NOT_EDITABLE' }, { status: 400 });
    }

    if (reminder.createdById !== userId && !hasMinRole(role, 'ADMIN')) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const updated = await prisma.reminder.update({
      where: { id: rid },
      data: parsed.data,
      select: REMINDER_SELECT,
    });

    return Response.json(updated);
  } catch (error) {
    console.error('[PATCH /api/leads/:id/reminders/:rid] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; rid: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id, rid } = await params;
  const { companyId, userId, role } = actor;

  try {
    const reminder = await findOwnedReminder(rid, id, companyId, role, userId);
    if (!reminder) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (reminder.status !== 'PENDING') {
      return Response.json({ error: 'REMINDER_NOT_EDITABLE' }, { status: 400 });
    }

    if (reminder.createdById !== userId && !hasMinRole(role, 'ADMIN')) {
      return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    await prisma.reminder.update({
      where: { id: rid },
      data: { status: 'CANCELLED' },
    });

    await writeEvent(companyId, 'REMINDER_CANCELLED', {
      leadId: reminder.leadId,
      userId,
      payload: { reminderId: rid },
    });

    return Response.json({ success: true, status: 'CANCELLED' });
  } catch (error) {
    console.error('[DELETE /api/leads/:id/reminders/:rid] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
