import type { Prisma } from '@prisma/client';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { isMappedRowEmpty, mapRow } from '@/lib/import/mapRow';
import { ImportParseError, parseImportFile } from '@/lib/import/parseFile';
import { suggestMapping } from '@/lib/import/suggestMapping';
import { prisma } from '@/lib/prisma';
import { previewRemapSchema } from '@/lib/validations/import';
import type {
  ImportPreviewDedupResult,
  ImportPreviewParseResult,
  ImportPreviewRowResult,
  MappedRowFields,
} from '@/types/import';

/**
 * Two stages behind one endpoint (import.md): multipart → parse + suggest
 * mapping; application/json → apply mapping + dedup preview. Not a file
 * re-upload on the second call — the client already holds the full parsed
 * row set from the first response.
 */
export async function POST(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    return handleParseStage(request);
  }

  if (contentType.includes('application/json')) {
    return handleDedupStage(request, actor.companyId);
  }

  return Response.json({ error: 'UNSUPPORTED_CONTENT_TYPE' }, { status: 400 });
}

async function handleParseStage(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'INVALID_FORM_DATA' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'FILE_REQUIRED' }, { status: 400 });
  }

  try {
    const { columns, rows } = await parseImportFile(file);
    const suggestedMapping = suggestMapping(columns);

    const result: ImportPreviewParseResult = { columns, rows, suggestedMapping };
    return Response.json(result);
  } catch (error) {
    if (error instanceof ImportParseError) {
      return Response.json({ error: error.code }, { status: 400 });
    }
    console.error('[POST /api/import/preview] parse failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

async function handleDedupStage(
  request: Request,
  companyId: string,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = previewRemapSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { mapping, rows } = parsed.data;

  try {
    const mappedRows = rows.map((row) => mapRow(row, mapping));
    const { matchedPhones, matchedEmails } = await findBatchDuplicates(
      companyId,
      mappedRows,
    );

    let willCreate = 0;
    let possibleDuplicates = 0;
    let errors = 0;

    const rowResults: ImportPreviewRowResult[] = mappedRows.map((fields, index) => {
      const isError = isMappedRowEmpty(fields);
      const isDuplicate =
        !isError &&
        ((fields.phone !== null && matchedPhones.has(fields.phone)) ||
          (fields.email !== null && matchedEmails.has(fields.email)));

      if (isError) {
        errors += 1;
      } else {
        willCreate += 1;
        if (isDuplicate) possibleDuplicates += 1;
      }

      return { index, isDuplicate, isError };
    });

    const result: ImportPreviewDedupResult = {
      totalRows: rows.length,
      willCreate,
      possibleDuplicates,
      errors,
      rows: rowResults,
    };
    return Response.json(result);
  } catch (error) {
    console.error('[POST /api/import/preview] dedup failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

/**
 * Single batch query against existing company leads — not one SELECT per row.
 * Matches the semantics of lib/intake/findPossibleDuplicates.ts (existing
 * leads only, not cross-row matches within the same file).
 */
async function findBatchDuplicates(
  companyId: string,
  mappedRows: MappedRowFields[],
): Promise<{ matchedPhones: Set<string>; matchedEmails: Set<string> }> {
  const phones = new Set<string>();
  const emails = new Set<string>();

  for (const fields of mappedRows) {
    if (fields.phone) phones.add(fields.phone);
    if (fields.email) emails.add(fields.email);
  }

  const matchedPhones = new Set<string>();
  const matchedEmails = new Set<string>();

  if (phones.size === 0 && emails.size === 0) {
    return { matchedPhones, matchedEmails };
  }

  const orConditions: Prisma.LeadWhereInput[] = [];
  if (phones.size > 0) orConditions.push({ phone: { in: [...phones] } });
  if (emails.size > 0) orConditions.push({ email: { in: [...emails] } });

  const matches = await prisma.lead.findMany({
    where: { companyId, OR: orConditions },
    select: { phone: true, email: true },
  });

  for (const match of matches) {
    if (match.phone && phones.has(match.phone)) matchedPhones.add(match.phone);
    if (match.email && emails.has(match.email)) matchedEmails.add(match.email);
  }

  return { matchedPhones, matchedEmails };
}
