import { DomainError } from "../errors";

// In-memory fixed-window limiter, scoped per key (tenant + action). This is
// intentionally single-process: V7 runs as one Railway service today, so
// this is a real backstop against a runaway client or bug hammering the AI
// endpoint. It resets on deploy/restart and does not coordinate across
// horizontal replicas -- move this to Redis (or Postgres) before scaling to
// more than one instance, per Phase 1 design's ShipSafe-spec section.
interface WindowState {
  count: number;
  windowStartedAt: number;
}

const windows = new Map<string, WindowState>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): void {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now - existing.windowStartedAt >= config.windowMs) {
    windows.set(key, { count: 1, windowStartedAt: now });
    return;
  }

  if (existing.count >= config.maxRequests) {
    throw new DomainError(
      `Rate limit exceeded. Try again in ${Math.ceil((config.windowMs - (now - existing.windowStartedAt)) / 1000)}s.`,
    );
  }

  existing.count += 1;
}
