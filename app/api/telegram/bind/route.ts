import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';
import { createBindToken } from '@/lib/telegram/bindToken';

export const runtime = 'nodejs';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function POST(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return Response.json(
      { error: 'Telegram bot is not configured' },
      { status: 503 },
    );
  }

  try {
    const token = await createBindToken(actor.userId);
    return Response.json({
      deepLink: `https://t.me/${botUsername}?start=${token}`,
    });
  } catch (error) {
    console.error('Failed to create Telegram bind token:', error);
    return Response.json(
      { error: 'Failed to create Telegram bind token' },
      { status: 500 },
    );
  }
}

export async function DELETE(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  try {
    await prisma.user.update({
      where: { id: actor.userId },
      data: { telegramChatId: null },
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Failed to unbind Telegram:', error);
    return Response.json(
      { error: 'Failed to unbind Telegram' },
      { status: 500 },
    );
  }
}
