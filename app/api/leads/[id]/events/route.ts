import type { Prisma } from '@prisma/client';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/constants/defaultCompanyData';
import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';

function getLeadVisibility(settings: unknown): CompanySettings['leadVisibility'] {
  if (
    settings &&
    typeof settings === 'object' &&
    'leadVisibility' in settings &&
    (settings.leadVisibility === 'ALL' || settings.leadVisibility === 'OWN')
  ) {
    return settings.leadVisibility;
  }
  return DEFAULT_COMPANY_SETTINGS.leadVisibility;
}

function extractLossReasonId(payload: Prisma.JsonValue): string | null {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload) &&
    'lossReasonId' in payload &&
    typeof (payload as Record<string, unknown>).lossReasonId === 'string'
  ) {
    return (payload as Record<string, unknown>).lossReasonId as string;
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'MANAGER',
      method: 'GET',
      pathname: `/api/leads/${id}/events`,
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
    const visibility =
      actor.actor === 'user' ? visibilityWhere(actor.role, actor.userId, leadVisibility) : {};

    const andConditions: Prisma.LeadWhereInput[] = [{ id }, { companyId }];
    if (Object.keys(visibility).length > 0) {
      andConditions.push(visibility);
    }

    const lead = await prisma.lead.findFirst({
      where: { AND: andConditions },
      select: { id: true },
    });

    if (!lead) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const rawEvents = await prisma.event.findMany({
      where: { leadId: id, companyId },
      select: { id: true, type: true, createdAt: true, userId: true, payload: true },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = [
      ...new Set(
        rawEvents.map((e) => e.userId).filter((uid): uid is string => uid !== null),
      ),
    ];
    const lossReasonIds = [
      ...new Set(
        rawEvents
          .filter((e) => e.type === 'LEAD_LOST')
          .map((e) => extractLossReasonId(e.payload))
          .filter((lid): lid is string => lid !== null),
      ),
    ];

    const [users, lossReasons] = await Promise.all([
      userIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      lossReasonIds.length > 0
        ? prisma.lossReason.findMany({
            where: { id: { in: lossReasonIds } },
            select: { id: true, label: true },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const lossReasonMap = new Map(lossReasons.map((lr) => [lr.id, lr.label]));

    const events = rawEvents.map((event) => {
      const lossReasonId =
        event.type === 'LEAD_LOST' ? extractLossReasonId(event.payload) : null;
      return {
        id: event.id,
        type: event.type,
        createdAt: event.createdAt.toISOString(),
        userName: event.userId ? (userMap.get(event.userId) ?? null) : null,
        lossReasonLabel: lossReasonId ? (lossReasonMap.get(lossReasonId) ?? null) : null,
      };
    });

    return Response.json(events);
  } catch (error) {
    console.error('[GET /api/leads/:id/events] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
