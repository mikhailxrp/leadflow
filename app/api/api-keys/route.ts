import { generateApiKey, maskApiKey } from '@/lib/apiKeys/generateApiKey';
import { requireCompanyAccess } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';
import { createApiKeySchema } from '@/lib/validations/apiKeys';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'ADMIN',
      method: 'GET',
      pathname: '/api/api-keys',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  try {
    const keys = await prisma.apiKey.findMany({
      where: { companyId: actor.companyId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, sourceLabel: true, keyHash: true, createdAt: true },
    });

    return Response.json(
      keys.map(({ keyHash, ...key }) => ({ ...key, mask: maskApiKey(keyHash) })),
    );
  } catch (error) {
    console.error('[GET /api/api-keys] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyAccess({
      minRole: 'ADMIN',
      method: 'POST',
      pathname: '/api/api-keys',
    });
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

  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const { name, sourceLabel } = parsed.data;

  try {
    const { plaintext, keyHash } = generateApiKey();

    const created = await prisma.apiKey.create({
      data: { companyId: actor.companyId, name, sourceLabel, keyHash },
      select: { id: true, name: true, sourceLabel: true, createdAt: true },
    });

    return Response.json({ ...created, plaintext }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/api-keys] failed:', error);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
