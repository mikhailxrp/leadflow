import { requireCompanyAccess, requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { hasMinRole } from '@/constants/roles';
import { assignLead, assignLeadTo } from '@/lib/assignLead';
import { createLead } from '@/lib/intake/createLead';
import { findPossibleDuplicates } from '@/lib/intake/findPossibleDuplicates';
import { flagPossibleDuplicates } from '@/lib/intake/flagPossibleDuplicates';
import { enrichYandexLead } from '@/lib/intake/yandex';
import { getLeadsWithRisk } from '@/lib/leads/getLeads';
import { notifyNewLead } from '@/lib/notifications/notifyNewLead';
import { createLeadSchema, leadsQuerySchema } from '@/lib/validations/leads';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = leadsQuerySchema.safeParse({
    search: searchParams.get('search') ?? undefined,
    source: searchParams.get('source') ?? undefined,
    assignedToId: searchParams.get('assignedToId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    period: searchParams.get('period') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  let actor;
  try {
    actor = await requireCompanyAccess({ minRole: 'MANAGER', method: 'GET', pathname: '/api/leads' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    const result = await getLeadsWithRisk(parsed.data, actor);
    return Response.json(result);
  } catch (error) {
    console.error('[GET /api/leads] getLeadsWithRisk failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

function toNullableString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function POST(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const companyId = user.companyId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { confirmDuplicate, ...rest } = parsed.data;

  if (!confirmDuplicate) {
    const phone = toNullableString(rest.phone);
    const email = toNullableString(rest.email);

    if (phone || email) {
      const possibleDuplicates = await findPossibleDuplicates(companyId, phone, email);

      if (possibleDuplicates.length > 0) {
        return Response.json(
          {
            error: 'POSSIBLE_DUPLICATE',
            possibleDuplicates,
          },
          { status: 409 },
        );
      }
    }
  }

  try {
    const lead = await createLead(rest as Record<string, unknown>, 'manual', companyId);

    if (confirmDuplicate) {
      void flagPossibleDuplicates(lead.id, companyId).catch(console.error);
    }

    void enrichYandexLead(lead.id, companyId).catch(console.error);

    // Лид, созданный менеджером, закрепляется за самим создателем — правила назначения к нему
    // не применяются. Каскад правил (assignLead) работает только для лидов из источников и
    // созданных руководителем/администратором (HEAD и выше).
    if (hasMinRole(user.role, 'HEAD')) {
      await assignLead(lead.id, companyId).catch((error) => {
        console.error('[POST /api/leads] assignLead failed:', error);
      });
    } else {
      await assignLeadTo(lead.id, companyId, user.userId, user.userId).catch((error) => {
        console.error('[POST /api/leads] assignLeadTo (creator) failed:', error);
      });
    }

    void notifyNewLead(lead.id, companyId).catch((error) => {
      console.error('[POST /api/leads] notifyNewLead failed:', error);
    });

    return Response.json({ id: lead.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/leads] createLead failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
