import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { getLeadVisibility } from '@/lib/leads/visibilityFilter';
import { getBoardData } from '@/lib/pipeline/boardQuery';
import { prisma } from '@/lib/prisma';
import { boardQuerySchema } from '@/lib/validations/pipeline';

export async function GET(request: Request): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = boardQuerySchema.safeParse({
    includeClosed: searchParams.get('includeClosed') ?? undefined,
    assignedToId: searchParams.get('assignedToId') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const companyId = session.user.companyId;

  try {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { settings: true },
    });

    const leadVisibility = getLeadVisibility(company.settings);

    const boardData = await getBoardData({
      companyId,
      userId: session.user.id,
      role: session.user.role,
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
