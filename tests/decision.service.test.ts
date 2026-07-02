import {
  assembleDecisionObject,
  getDecisionObjectForTenant,
  listTenantDecisionObjects,
} from "../src/lib/decision/service";
import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { InMemoryEvolutionLoopRunRepository } from "../src/lib/evolution-loop/repository";
import type { CognitiveObject } from "../src/lib/cognitive-object/types";
import type { EvolutionLoopRun } from "../src/lib/evolution-loop/types";

function makeDecision(overrides: Partial<CognitiveObject> = {}): CognitiveObject {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    tenantId: "tenant_a",
    createdByUserId: "user_1",
    objectType: "decision",
    title: "Choose deployment architecture",
    objective: "Decide how to deploy the MVP.",
    status: "analyzing",
    source: "manual",
    riskLevel: "medium",
    confidenceScore: 80,
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    updatedAt: new Date("2026-07-01T10:00:00.000Z"),
    ...overrides,
  };
}

function makeRun(overrides: Partial<EvolutionLoopRun>): EvolutionLoopRun {
  return {
    id: crypto.randomUUID(),
    tenantId: "tenant_a",
    objectId: "obj_1",
    loopVersion: "mvp-1",
    intentSummary: null,
    hiddenGoal: null,
    contextSummary: null,
    assumptions: [],
    optionsConsidered: [],
    critique: [],
    risks: [],
    recommendation: null,
    confidenceScore: null,
    releaseScore: null,
    releaseScoreBreakdown: [],
    approvalRequired: false,
    approvalReason: null,
    createdAt: new Date("2026-07-01T11:00:00.000Z"),
    ...overrides,
  };
}

describe("assembleDecisionObject", () => {
  it("uses the newest loop run for reasoning fields", () => {
    const object = makeDecision({ id: "obj_1" });
    const runs = [
      makeRun({
        createdAt: new Date("2026-07-01T13:00:00.000Z"),
        recommendation: "Use Railway for MVP.",
        approvalRequired: true,
        approvalReason: "Architecture affects cost.",
        assumptions: [{ text: "Railway hosts app + DB", riskLevel: "low", needsVerification: false }],
      }),
      makeRun({ createdAt: new Date("2026-07-01T11:00:00.000Z"), recommendation: "Old take." }),
    ];

    const view = assembleDecisionObject(object, runs);

    expect(view.objective).toBe("Decide how to deploy the MVP.");
    expect(view.recommendation).toBe("Use Railway for MVP.");
    expect(view.approvalRequired).toBe(true);
    expect(view.approvalReason).toBe("Architecture affects cost.");
    expect(view.assumptions).toHaveLength(1);
    expect(view.loopRunCount).toBe(2);
    expect(view.latestLoopRunAt).toEqual(new Date("2026-07-01T13:00:00.000Z"));
  });

  it("produces a valid view with no loop runs", () => {
    const view = assembleDecisionObject(makeDecision(), []);

    expect(view.recommendation).toBeNull();
    expect(view.approvalRequired).toBe(false);
    expect(view.assumptions).toEqual([]);
    expect(view.loopRunCount).toBe(0);
    expect(view.latestLoopRunAt).toBeNull();
  });
});

describe("getDecisionObjectForTenant", () => {
  it("returns the view for a decision object", async () => {
    const objects = new InMemoryCognitiveObjectRepository();
    const runs = new InMemoryEvolutionLoopRunRepository();
    const created = await objects.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Pick a database",
      objective: "Choose Postgres host.",
      source: "manual",
      riskLevel: "medium",
      tags: [],
    });

    const view = await getDecisionObjectForTenant(objects, runs, created.id, "tenant_a");

    expect(view?.title).toBe("Pick a database");
    expect(view?.objective).toBe("Choose Postgres host.");
  });

  it("returns null for a non-decision object", async () => {
    const objects = new InMemoryCognitiveObjectRepository();
    const runs = new InMemoryEvolutionLoopRunRepository();
    const created = await objects.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "memory",
      title: "A memory, not a decision",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const view = await getDecisionObjectForTenant(objects, runs, created.id, "tenant_a");

    expect(view).toBeNull();
  });

  it("does not leak decisions across tenants", async () => {
    const objects = new InMemoryCognitiveObjectRepository();
    const runs = new InMemoryEvolutionLoopRunRepository();
    const created = await objects.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Tenant A decision",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    expect(await getDecisionObjectForTenant(objects, runs, created.id, "tenant_b")).toBeNull();
  });
});

describe("listTenantDecisionObjects", () => {
  it("returns only decision-type objects for the tenant", async () => {
    const objects = new InMemoryCognitiveObjectRepository();
    const base = {
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      source: "manual" as const,
      riskLevel: "low" as const,
      tags: [],
    };
    await objects.create({ ...base, objectType: "decision", title: "Decision 1" });
    await objects.create({ ...base, objectType: "memory", title: "Memory 1" });
    await objects.create({ ...base, objectType: "decision", title: "Decision 2" });

    const decisions = await listTenantDecisionObjects(objects, "tenant_a");

    expect(decisions).toHaveLength(2);
    expect(decisions.every((object) => object.objectType === "decision")).toBe(true);
  });
});
