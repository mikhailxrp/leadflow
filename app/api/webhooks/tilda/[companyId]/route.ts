import { checkRateLimit } from '@/lib/rateLimit';
import { parseBody } from '@/lib/intake/parseBody';
import { createLead } from '@/lib/intake/createLead';
import { flagPossibleDuplicates } from '@/lib/intake/flagPossibleDuplicates';
import { touchIntegrationSource } from '@/lib/intake/touchIntegrationSource';
import { webhookBodySchema } from '@/lib/validations/webhooks';
import { prisma } from '@/lib/prisma';

function getIp(request: Request): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  const ip = getIp(request);

  if (!checkRateLimit(ip, 60, 60_000)) {
    return Response.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }

  const { companyId } = await params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    return Response.json({ error: 'Company not found' }, { status: 404 });
  }

  // parseBody MUST come before any test-request check — stream is consumed once
  const body = webhookBodySchema.parse(await parseBody(request));

  if (body['test'] === 'test') {
    return Response.json({ ok: true });
  }

  try {
    const lead = await createLead(body, 'tilda', companyId);
    await touchIntegrationSource(companyId, 'tilda', '', false);
    void flagPossibleDuplicates(lead.id, companyId).catch(console.error);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[tilda webhook] createLead failed:', error);
    await touchIntegrationSource(companyId, 'tilda', '', true);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
