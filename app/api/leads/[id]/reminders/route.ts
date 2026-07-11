import type { Prisma } from '@prisma/client';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { getLeadVisibility, visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { createReminderSchema } from '@/lib/validations/reminders';

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

async function findAccessibleLead(
  leadId: string,
  companyId: string,
  actor: Awaited<ReturnType<typeof requireCompanyUser>>,
): Promise<{ id: string } | null> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });

  const leadVisibility = getLeadVisibility(company.settings);
  const visibility = visibilityWhere(actor.role, actor.userId, leadVisibility);

  const andConditions: Prisma.LeadWhereInput[] = [{ id: leadId }, { companyId }];
  if (Object.keys(visibility).length > 0) {
    andConditions.push(visibility);
  }

  return prisma.lead.findFirst({
    where: { AND: andConditions },
    select: { id: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id } = await params;
  const { companyId } = actor;

  try {
    const lead = await findAccessibleLead(id, companyId, actor);
    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const reminders = await prisma.reminder.findMany({
      where: { leadId: id, companyId },
      select: REMINDER_SELECT,
      orderBy: { remindAt: 'asc' },
    });

    return Response.json(reminders);
  } catch (error) {
    console.error('[GET /api/leads/:id/reminders] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { id } = await params;
  const { companyId, userId } = actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createReminderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const lead = await findAccessibleLead(id, companyId, actor);
    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        companyId,
        leadId: id,
        createdById: userId,
        text: parsed.data.text,
        remindAt: parsed.data.remindAt,
        channels: parsed.data.channels,
      },
      select: REMINDER_SELECT,
    });

    await writeEvent(companyId, 'REMINDER_CREATED', {
      leadId: id,
      userId,
      payload: { reminderId: reminder.id },
    });

    return Response.json(reminder);
  } catch (error) {
    console.error('[POST /api/leads/:id/reminders] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
