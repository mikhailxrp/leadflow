import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { createLead } from '@/lib/intake/createLead';
import { findPossibleDuplicates } from '@/lib/intake/findPossibleDuplicates';
import { flagPossibleDuplicates } from '@/lib/intake/flagPossibleDuplicates';
import { createLeadSchema } from '@/lib/validations/leads';

function toNullableString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session || session.kind !== 'company' || !session.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasMinRole(session.user.role, 'MANAGER')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const companyId = session.user.companyId;

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

    return Response.json({ id: lead.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/leads] createLead failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
