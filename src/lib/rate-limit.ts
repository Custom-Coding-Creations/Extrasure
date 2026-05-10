import type { NextRequest } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  rateLimitStore?: RateLimitStore;
};

function getStore() {
  if (!globalForRateLimit.rateLimitStore) {
    globalForRateLimit.rateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalForRateLimit.rateLimitStore;
}

export function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();

  return cfIp || realIp || forwardedFor || "unknown";
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const store = getStore();
  const now = Date.now();

  for (const [entryKey, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(entryKey);
    }
  }

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + windowMs,
    };

    store.set(key, nextEntry);

    return {
      ok: true,
      remaining: Math.max(maxRequests - 1, 0),
      resetAt: nextEntry.resetAt,
    };
  }

  if (current.count >= maxRequests) {
    return {
      ok: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    ok: true,
    remaining: Math.max(maxRequests - current.count, 0),
    resetAt: current.resetAt,
  };
}
