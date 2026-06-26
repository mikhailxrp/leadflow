import type { Prisma, UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import { COMMENT_SELECT, serializeComment } from '@/lib/leads/commentSelect';
import { getLeadVisibility, visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import { commentSchema } from '@/lib/validations/leads';

async function findAccessibleLead(
  leadId: string,
  companyId: string,
  role: UserRole,
  userId: string,
): Promise<{ id: string } | null> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });

  const leadVisibility = getLeadVisibility(company.settings);
  const visibility = visibilityWhere(role, userId, leadVisibility);

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
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId, id: userId, role } = session.user;

  try {
    const lead = await findAccessibleLead(id, companyId, role, userId);

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: {
        leadId: id,
        lead: { companyId },
      },
      select: COMMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    return Response.json(comments.map(serializeComment));
  } catch (error) {
    console.error('[GET /api/leads/:id/comments] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { companyId, id: userId, role } = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const lead = await findAccessibleLead(id, companyId, role, userId);

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        leadId: id,
        userId,
        text: parsed.data.text,
      },
      select: COMMENT_SELECT,
    });

    await writeEvent(companyId, 'COMMENTED', { leadId: id, userId });

    return Response.json(serializeComment(comment), { status: 201 });
  } catch (error) {
    console.error('[POST /api/leads/:id/comments] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
