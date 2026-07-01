// Lightweight in-memory rate limiter. Sufficient for a single-instance demo; swap for a shared
// store (Redis/Upstash) before running multiple instances in production.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > MAX_BUCKETS) {
      for (const [existing, value] of buckets) if (value.resetAt <= now) buckets.delete(existing);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Standard 429 response for a blocked request. */
export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(Math.max(retryAfterSeconds, 1)) } }
  );
}
