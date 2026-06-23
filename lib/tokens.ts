import { createHash, randomBytes } from 'crypto';

const TOKEN_BYTE_LENGTH = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTE_LENGTH).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
