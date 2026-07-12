import { generateToken, hashToken } from '@/lib/tokens';

export type GeneratedApiKey = {
  plaintext: string;
  keyHash: string;
};

/** Plaintext is returned once by the caller and never persisted — only `keyHash` is stored. */
export function generateApiKey(): GeneratedApiKey {
  const plaintext = generateToken();
  const keyHash = hashToken(plaintext);
  return { plaintext, keyHash };
}

/**
 * Display fingerprint derived from the stored hash — not a fragment of the real key.
 * The plaintext is never stored, so this is the only way to give a key a stable, distinguishable label.
 */
export function maskApiKey(keyHash: string): string {
  return keyHash.slice(0, 8);
}
