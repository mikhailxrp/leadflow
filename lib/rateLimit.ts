const store = new Map<string, number[]>();

/**
 * Fixed-window in-memory rate limiter.
 * Returns true if the request is allowed, false if rate limit exceeded.
 * If key is undefined (IP unknown — dev without proxy), rate limiting is
 * skipped entirely: the request is always allowed without touching the store.
 */
export function checkRateLimit(
  key: string | undefined,
  limit: number,
  windowMs: number,
): boolean {
  if (key === undefined) return true;

  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    store.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}
