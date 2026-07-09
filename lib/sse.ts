import type { UserRole } from '@prisma/client';

export type Connection = {
  userId: string;
  role: UserRole;
  send: (data: unknown) => void;
  close: () => void;
};

const registry = new Map<string, Set<Connection>>();

export function addConnection(companyId: string, connection: Connection): void {
  let connections = registry.get(companyId);
  if (!connections) {
    connections = new Set();
    registry.set(companyId, connections);
  }
  connections.add(connection);
}

export function removeConnection(companyId: string, connection: Connection): void {
  const connections = registry.get(companyId);
  if (!connections) return;

  connections.delete(connection);
  if (connections.size === 0) {
    registry.delete(companyId);
  }
}

export function broadcast(
  companyId: string,
  payload: unknown,
  predicate?: (connection: Connection) => boolean,
): void {
  const connections = registry.get(companyId);
  if (!connections) return;

  for (const connection of connections) {
    if (predicate && !predicate(connection)) continue;
    connection.send(payload);
  }
}

export function encodeSseMessage(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function encodeSseHeartbeat(): string {
  return ': keep-alive\n\n';
}
