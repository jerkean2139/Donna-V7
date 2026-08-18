import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-identifier request throttling. Uses Upstash Redis when configured (works
// across serverless instances / regions); otherwise falls back to a best-effort
// in-memory sliding window so protection exists in dev and before the key is
// set — the fallback is per-instance and non-durable, which is documented and
// acceptable as a floor, not a guarantee.

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms when the window resets
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number.parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10);

// In-memory sliding window: keep recent hit timestamps per identifier.
export class InMemoryRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  limit(identifier: string, now: number = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(identifier) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= this.max) {
      this.hits.set(identifier, recent);
      return {
        success: false,
        limit: this.max,
        remaining: 0,
        reset: recent[0]! + this.windowMs,
      };
    }

    recent.push(now);
    this.hits.set(identifier, recent);

    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (this.hits.size > 10_000) {
      for (const [key, list] of this.hits) {
        if (list.every((ts) => ts <= cutoff)) this.hits.delete(key);
      }
    }

    return {
      success: true,
      limit: this.max,
      remaining: this.max - recent.length,
      reset: now + this.windowMs,
    };
  }
}

const memoryLimiter = new InMemoryRateLimiter(MAX_REQUESTS, WINDOW_MS);

const upstash =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "60 s"),
        prefix: "donna:rl",
        analytics: false,
      })
    : null;

export const rateLimitBackend: "upstash" | "in-memory" = upstash ? "upstash" : "in-memory";

export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  if (upstash) {
    const result = await upstash.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }
  return memoryLimiter.limit(identifier);
}
