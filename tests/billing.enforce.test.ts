import { vi } from "vitest";

// Controllable Clerk plan entitlement. null => no paid plan (free starter).
let currentPlan: string | null = null;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({
    has: ({ plan }: { plan?: string }) => plan != null && plan === currentPlan,
  }),
}));

import { getTenantPlan } from "../src/lib/auth/plan";
import { assertAiRunQuota, getAiRunQuota } from "../src/lib/billing/enforce";
import { PlanLimitError } from "../src/lib/billing/plans";
import { agentRunRepository, evolutionLoopRunRepository } from "../src/lib/repositories";

async function seedRuns(tenantId: string, agentRuns: number, loopRuns: number) {
  for (let i = 0; i < agentRuns; i += 1) {
    await agentRunRepository.create({ tenantId, objectId: "o", agentName: "X", task: "t", status: "completed" });
  }
  for (let i = 0; i < loopRuns; i += 1) {
    await evolutionLoopRunRepository.create({ tenantId, objectId: "o" });
  }
}

describe("getTenantPlan", () => {
  it("resolves the highest entitled plan, defaulting to starter", async () => {
    currentPlan = "enterprise";
    expect(await getTenantPlan()).toBe("enterprise");
    currentPlan = "pro";
    expect(await getTenantPlan()).toBe("pro");
    currentPlan = null;
    expect(await getTenantPlan()).toBe("starter");
  });
});

describe("AI-run quota enforcement", () => {
  it("counts agent runs AND loop runs against one cap", async () => {
    currentPlan = null; // starter, cap 100
    const tenantId = `org_bill_${crypto.randomUUID()}`;
    await seedRuns(tenantId, 60, 40);

    const quota = await getAiRunQuota(tenantId);
    expect(quota.used).toBe(100);
    expect(quota.withinLimit).toBe(false);
    await expect(assertAiRunQuota(tenantId)).rejects.toBeInstanceOf(PlanLimitError);
  });

  it("allows the same usage on a higher tier", async () => {
    currentPlan = "pro"; // cap 1000
    const tenantId = `org_bill_${crypto.randomUUID()}`;
    await seedRuns(tenantId, 60, 40);

    const quota = await getAiRunQuota(tenantId);
    expect(quota.used).toBe(100);
    expect(quota.withinLimit).toBe(true);
    await expect(assertAiRunQuota(tenantId)).resolves.toBeUndefined();
  });

  it("never blocks enterprise", async () => {
    currentPlan = "enterprise";
    const tenantId = `org_bill_${crypto.randomUUID()}`;
    await seedRuns(tenantId, 5, 5);
    await expect(assertAiRunQuota(tenantId)).resolves.toBeUndefined();
  });
});
