import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import {
  addConnection,
  encodeSseHeartbeat,
  encodeSseMessage,
  removeConnection,
  type Connection,
} from '@/lib/sse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_INTERVAL_MS = 20_000;

export async function GET(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireCompanyUser({ minRole: 'MANAGER' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const { companyId, userId, role } = user;
  const encoder = new TextEncoder();

  let connection: Connection;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      connection = {
        userId,
        role,
        send: (data) => controller.enqueue(encoder.encode(encodeSseMessage(data))),
        close: () => controller.close(),
      };

      addConnection(companyId, connection);

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(encodeSseHeartbeat()));
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeConnection(companyId, connection);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      clearInterval(heartbeat);
      removeConnection(companyId, connection);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
