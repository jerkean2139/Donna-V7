import { InMemoryRateLimiter } from "../src/lib/rate-limit";

describe("InMemoryRateLimiter", () => {
  it("allows requests up to the limit, then blocks", () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);
    const t = 1_000_000;

    expect(limiter.limit("ip", t).success).toBe(true);
    expect(limiter.limit("ip", t + 1).success).toBe(true);
    const third = limiter.limit("ip", t + 2);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = limiter.limit("ip", t + 3);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("tracks identifiers independently", () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);
    const t = 1_000_000;

    expect(limiter.limit("a", t).success).toBe(true);
    expect(limiter.limit("b", t).success).toBe(true); // different id, own budget
    expect(limiter.limit("a", t + 1).success).toBe(false);
  });

  it("slides: old hits outside the window free up capacity", () => {
    const limiter = new InMemoryRateLimiter(2, 60_000);
    const t = 1_000_000;

    expect(limiter.limit("ip", t).success).toBe(true);
    expect(limiter.limit("ip", t + 10).success).toBe(true);
    expect(limiter.limit("ip", t + 20).success).toBe(false);

    // Move past the window relative to the first two hits.
    const later = t + 60_001;
    expect(limiter.limit("ip", later).success).toBe(true);
  });

  it("reports the reset time based on the oldest hit in the window", () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);
    const t = 1_000_000;
    limiter.limit("ip", t);
    const blocked = limiter.limit("ip", t + 5);
    expect(blocked.success).toBe(false);
    expect(blocked.reset).toBe(t + 60_000);
  });
});
