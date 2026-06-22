import { prisma } from '@/lib/prisma';

export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: 'connected' }, { status: 200 });
  } catch {
    return Response.json({ ok: false, db: 'error' }, { status: 503 });
  }
}
