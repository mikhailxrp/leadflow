import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { adSpendQuerySchema, adSpendSchema } from '@/lib/validations/adSpend';
import type { AdSpendRecord } from '@/types/reports';

const PATH = '/api/ad-spend';

function yearMonthKey(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function isWithinRange(
  record: { year: number; month: number },
  from?: string,
  to?: string,
): boolean {
  const key = yearMonthKey(record.year, record.month);

  if (from) {
    const fromDate = new Date(from);
    if (key < yearMonthKey(fromDate.getUTCFullYear(), fromDate.getUTCMonth() + 1)) return false;
  }

  if (to) {
    const toDate = new Date(to);
    if (key > yearMonthKey(toDate.getUTCFullYear(), toDate.getUTCMonth() + 1)) return false;
  }

  return true;
}

export async function GET(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyAccess({ minRole: 'HEAD', method: 'GET', pathname: PATH });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = adSpendQuerySchema.safeParse({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });

  if (!parsedQuery.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { from, to } = parsedQuery.data;

  try {
    const records = await prisma.adSpend.findMany({
      where: { companyId: actor.companyId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Без from/to — весь справочник (нужен редактору для показа всех месяцев
    // независимо от текущего периода отчёта); с ними — только пересекающиеся месяцы.
    const filtered =
      from || to ? records.filter((record) => isWithinRange(record, from, to)) : records;

    const result: AdSpendRecord[] = filtered.map((record) => ({
      id: record.id,
      year: record.year,
      month: record.month,
      amountWithVat: Number(record.amountWithVat),
      note: record.note,
    }));

    return Response.json(result);
  } catch (error) {
    console.error('[GET /api/ad-spend] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyAccess({ minRole: 'HEAD', method: 'POST', pathname: PATH });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = adSpendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { year, month, amountWithVat, note } = parsed.data;
  const { companyId } = actor;
  const eventUserId = actor.actor === 'user' ? actor.userId : undefined;

  try {
    const record = await prisma.adSpend.upsert({
      where: { companyId_year_month: { companyId, year, month } },
      create: { companyId, year, month, amountWithVat, note, createdById: eventUserId },
      // createdById здесь намеренно отсутствует — «кто создал» не переписывается при правке.
      update: { amountWithVat, note },
    });

    await writeEvent(companyId, 'AD_SPEND_UPDATED', {
      userId: eventUserId,
      payload: { year, month, amountWithVat },
    });

    const result: AdSpendRecord = {
      id: record.id,
      year: record.year,
      month: record.month,
      amountWithVat: Number(record.amountWithVat),
      note: record.note,
    };

    return Response.json(result);
  } catch (error) {
    console.error('[POST /api/ad-spend] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
