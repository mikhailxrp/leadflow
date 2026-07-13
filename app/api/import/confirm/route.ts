import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { runImport } from '@/lib/import/runImport';
import { confirmImportSchema } from '@/lib/validations/import';

export async function POST(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = confirmImportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { fileName, mapping, rows } = parsed.data;

  try {
    const report = await runImport(
      actor.companyId,
      actor.userId,
      actor.impersonatedByPlatformAdminId ?? null,
      fileName,
      mapping,
      rows,
    );
    return Response.json(report);
  } catch (error) {
    console.error('[POST /api/import/confirm] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
