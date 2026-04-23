type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __noesisRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore = globalThis.__noesisRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__noesisRateLimitStore) {
  globalThis.__noesisRateLimitStore = rateLimitStore;
}

export function getRateLimitKey(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(":");
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
      retryAfterMs: windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: Math.max(0, current.resetAt - now),
  };
}
