import "server-only";

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitState>;

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

const RATE_LIMIT_STORE_KEY = "__ukprofit_rate_limit_store__";
const MAX_STORE_SIZE = 10_000;

function getStore() {
  const globalWithStore = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: RateLimitStore;
  };

  if (!globalWithStore[RATE_LIMIT_STORE_KEY]) {
    globalWithStore[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitState>();
  }

  return globalWithStore[RATE_LIMIT_STORE_KEY]!;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function pruneExpiredEntries(store: RateLimitStore, now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now();
  const store = getStore();

  if (store.size > MAX_STORE_SIZE) {
    pruneExpiredEntries(store, now);
  }

  const clientIp = getClientIp(request);
  const key = `${options.keyPrefix}:${clientIp}`;

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.limit - 1,
      retryAfterMs: options.windowMs,
    } as const;
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    } as const;
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - current.count),
    retryAfterMs: Math.max(0, current.resetAt - now),
  } as const;
}
