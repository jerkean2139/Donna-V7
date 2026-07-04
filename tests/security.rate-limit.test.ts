import { checkRateLimit } from "../src/lib/security/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the configured max within a window", () => {
    const key = `test_${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i += 1) {
      expect(() => checkRateLimit(key, { windowMs: 60_000, maxRequests: 5 })).not.toThrow();
    }
  });

  it("rejects the request once the max is exceeded within the window", () => {
    const key = `test_${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i += 1) {
      checkRateLimit(key, { windowMs: 60_000, maxRequests: 3 });
    }
    expect(() => checkRateLimit(key, { windowMs: 60_000, maxRequests: 3 })).toThrow(/Rate limit exceeded/);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test_a_${crypto.randomUUID()}`;
    const keyB = `test_b_${crypto.randomUUID()}`;
    checkRateLimit(keyA, { windowMs: 60_000, maxRequests: 1 });
    expect(() => checkRateLimit(keyB, { windowMs: 60_000, maxRequests: 1 })).not.toThrow();
    expect(() => checkRateLimit(keyA, { windowMs: 60_000, maxRequests: 1 })).toThrow();
  });
});
