import {
  PlanLimitError,
  assertWithinAiRunQuota,
  evaluateAiRunQuota,
  getPlanLimits,
  isUnlimited,
  startOfMonthUtc,
  UNLIMITED,
} from "../src/lib/billing/plans";

describe("plan limits", () => {
  it("returns starter as the safe default for an unknown tier", () => {
    // @ts-expect-error intentionally passing an invalid tier
    expect(getPlanLimits("mystery")).toBe(getPlanLimits("starter"));
  });

  it("scales caps up across tiers, enterprise unlimited", () => {
    expect(getPlanLimits("starter").maxAiRunsPerMonth).toBe(100);
    expect(getPlanLimits("pro").maxAiRunsPerMonth).toBe(1000);
    expect(isUnlimited(getPlanLimits("enterprise").maxAiRunsPerMonth)).toBe(true);
  });
});

describe("evaluateAiRunQuota", () => {
  it("computes remaining and withinLimit for a bounded tier", () => {
    const quota = evaluateAiRunQuota("starter", 90);
    expect(quota.remaining).toBe(10);
    expect(quota.withinLimit).toBe(true);
  });

  it("is over limit exactly at the cap (cap is exclusive)", () => {
    expect(evaluateAiRunQuota("starter", 100).withinLimit).toBe(false);
  });

  it("treats enterprise as always within limit", () => {
    const quota = evaluateAiRunQuota("enterprise", 999999);
    expect(quota.withinLimit).toBe(true);
    expect(quota.remaining).toBe(UNLIMITED);
  });
});

describe("assertWithinAiRunQuota", () => {
  it("does not throw when under the cap", () => {
    expect(() => assertWithinAiRunQuota("pro", 999)).not.toThrow();
  });

  it("throws PlanLimitError at the cap", () => {
    expect(() => assertWithinAiRunQuota("starter", 100)).toThrow(PlanLimitError);
  });

  it("never throws for enterprise", () => {
    expect(() => assertWithinAiRunQuota("enterprise", 10_000_000)).not.toThrow();
  });
});

describe("startOfMonthUtc", () => {
  it("returns midnight on the 1st of the month in UTC", () => {
    const result = startOfMonthUtc(new Date("2026-07-05T13:45:00.000Z"));
    expect(result.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });
});
