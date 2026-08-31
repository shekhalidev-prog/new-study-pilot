/**
 * Simple in-memory rate limiter for the AI endpoints.
 *
 * Fixed-window counter per key (e.g. `chat:<ip>`). This is intentionally
 * lightweight — no external store required — which is enough to stop a
 * single abusive client from burning through free-tier provider quotas at
 * the ~100 concurrent user scale this app targets. If you later run
 * multiple server instances behind a load balancer, swap this for a shared
 * store (Redis, Cloudflare KV, etc.) behind the same checkRateLimit signature.
 */

export interface RateLimitOptions {
  /** Size of the rolling window, in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key within the window. */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 60_000,
  max: 20,
};

const buckets = new Map<string, { count: number; resetAt: number }>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

/** Lazily sweeps expired buckets so the Map doesn't grow unbounded over a long-running process. */
function cleanupIfNeeded(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Checks and consumes one unit of quota for `key`. Call this once per
 * incoming request, per endpoint (namespace the key, e.g. `chat:${ip}`).
 */
export function checkRateLimit(
  key: string,
  options: Partial<RateLimitOptions> = {},
): RateLimitResult {
  const opts: RateLimitOptions = { ...DEFAULT_OPTIONS, ...options };
  const now = Date.now();
  cleanupIfNeeded(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.max - 1, retryAfterMs: 0 };
  }

  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: opts.max - existing.count, retryAfterMs: 0 };
}

/**
 * Best-effort client identifier from a standard Fetch `Request`, for use as
 * a rate-limit key. Works behind common reverse proxies / edge platforms.
 */
export function getClientIdFromRequest(request: Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    forwardedFor,
  ];
  const ip = candidates.find((v) => !!v && v.length > 0);
  return ip ?? "anonymous";
}
