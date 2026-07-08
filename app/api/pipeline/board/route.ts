import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { getLeadVisibility } from '@/lib/leads/visibilityFilter';
import { getBoardData } from '@/lib/pipeline/boardQuery';
import { prisma } from '@/lib/prisma';
import { boardQuerySchema } from '@/lib/validations/pipeline';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = boardQuerySchema.safeParse({
    includeClosed: searchParams.get('includeClosed') ?? undefined,
    assignedToId: searchParams.get('assignedToId') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'MANAGER',
      method: 'GET',
      pathname: '/api/pipeline/board',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const companyId = actor.companyId;

  try {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { settings: true },
    });

    const leadVisibility = getLeadVisibility(company.settings);

    const boardData = await getBoardData({
      companyId,
      ...(actor.actor === 'user' ? { userId: actor.userId, role: actor.role } : {}),
      leadVisibility,
      companySettings: company.settings,
      includeClosed: parsed.data.includeClosed,
      assignedToId: parsed.data.assignedToId,
    });

    return Response.json(boardData);
  } catch (error) {
    console.error('[GET /api/pipeline/board] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
