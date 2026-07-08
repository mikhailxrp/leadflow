import 'server-only';

import type { EventType, Prisma } from '@prisma/client';
import { getPlatformEventLabel } from '@/constants/eventLabels';
import {
  isPlatformCompany,
  resolveOwnerRoles,
  visibilityWhere,
  type PlatformAdminIdentity,
} from '@/lib/platform/companyVisibility';
import { prisma } from '@/lib/prisma';
import type {
  PlatformLogItem,
  PlatformLogLeadSearchResult,
  PlatformLogsResponse,
} from '@/types/platform';

const PAGE_SIZE = 50;

export async function assertCompanyVisible(
  admin: PlatformAdminIdentity,
  companyId: string,
): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, ...visibilityWhere(admin) },
    select: { id: true, createdByPlatformAdminId: true },
  });

  if (!company) {
    throw new Response('Not found', { status: 404 });
  }

  if (admin.role === 'SUPER_ADMIN') {
    const ownerRoles = await resolveOwnerRoles([
      company.createdByPlatformAdminId,
    ]);
    const ownerRole = company.createdByPlatformAdminId
      ? ownerRoles.get(company.createdByPlatformAdminId)
      : undefined;

    if (!isPlatformCompany(company, ownerRole)) {
      throw new Response('Forbidden', { status: 403 });
    }
  }
}

function resolveActorLabel(
  event: {
    userId: string | null;
    impersonatedByPlatformAdminId: string | null;
  },
  userNameById: Map<string, string>,
): string {
  if (event.userId) {
    const name = userNameById.get(event.userId) ?? 'Пользователь';
    return event.impersonatedByPlatformAdminId ? `${name} (поддержка)` : name;
  }

  if (event.impersonatedByPlatformAdminId) {
    return 'Маркетолог (платформа)';
  }

  return 'Система';
}

export type GetCompanyLogsParams = {
  admin: PlatformAdminIdentity;
  companyId: string;
  type?: EventType;
  from?: string;
  to?: string;
  leadId?: string;
  page: number;
};

export async function getCompanyLogs({
  admin,
  companyId,
  type,
  from,
  to,
  leadId,
  page,
}: GetCompanyLogsParams): Promise<PlatformLogsResponse> {
  await assertCompanyVisible(admin, companyId);

  if (leadId && admin.role !== 'MARKETER') {
    throw new Response('Forbidden', { status: 403 });
  }

  const where: Prisma.EventWhereInput = {
    companyId,
    ...(type ? { type } : {}),
    ...(leadId ? { leadId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  const hasMore = events.length > PAGE_SIZE;
  const pageEvents = hasMore ? events.slice(0, PAGE_SIZE) : events;

  const userIds = Array.from(
    new Set(
      pageEvents
        .map((event) => event.userId)
        .filter((id): id is string => id !== null),
    ),
  );

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds }, companyId },
        select: { id: true, name: true },
      })
    : [];

  const userNameById = new Map(users.map((user) => [user.id, user.name]));

  const items: PlatformLogItem[] = pageEvents.map((event) => ({
    id: event.id,
    type: event.type,
    label: getPlatformEventLabel(event.type),
    actorLabel: resolveActorLabel(event, userNameById),
    createdAt: event.createdAt.toISOString(),
    leadId: event.leadId,
    payload: event.payload,
  }));

  return { items, page, pageSize: PAGE_SIZE, hasMore };
}

export type SearchCompanyLeadsParams = {
  admin: PlatformAdminIdentity;
  companyId: string;
  q: string;
};

export async function searchCompanyLeads({
  admin,
  companyId,
  q,
}: SearchCompanyLeadsParams): Promise<PlatformLogLeadSearchResult[]> {
  await assertCompanyVisible(admin, companyId);

  const trimmed = q.trim();

  return prisma.lead.findMany({
    where: {
      companyId,
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { email: { contains: trimmed, mode: 'insensitive' } },
        { phone: { contains: trimmed } },
      ],
    },
    take: 20,
    select: { id: true, name: true, phone: true, email: true },
  });
}
