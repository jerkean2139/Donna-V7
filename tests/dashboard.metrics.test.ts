import { computeDashboardMetrics } from "../src/lib/dashboard/metrics";
import type { CognitiveObject } from "../src/lib/cognitive-object/types";
import type { CognitiveGraphEdge } from "../src/lib/cognitive-graph/types";

function makeObject(overrides: Partial<CognitiveObject>): CognitiveObject {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    tenantId: "tenant_a",
    createdByUserId: "user_1",
    objectType: "memory",
    title: "Object",
    status: "active",
    source: "manual",
    riskLevel: "low",
    confidenceScore: 90,
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    ...overrides,
  };
}

function makeEdge(overrides: Partial<CognitiveGraphEdge>): CognitiveGraphEdge {
  return {
    id: crypto.randomUUID(),
    tenantId: "tenant_a",
    fromObjectId: "object_1",
    toObjectId: "object_2",
    relationshipType: "supports",
    strength: 80,
    source: "human",
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    ...overrides,
  };
}

describe("computeDashboardMetrics", () => {
  it("counts open objects, approvals, links, and breakdowns", () => {
    const objects = [
      // Low risk, high confidence, non-sensitive, active -> open, no approval.
      makeObject({ id: "a", objectType: "memory", riskLevel: "low", confidenceScore: 90, status: "active" }),
      // High-risk decision -> approval required, still open.
      makeObject({ id: "b", objectType: "decision", riskLevel: "high", confidenceScore: 90, status: "draft" }),
      // Low confidence but archived -> approval required, NOT open.
      makeObject({ id: "c", objectType: "research", riskLevel: "low", confidenceScore: 50, status: "archived" }),
    ];
    const edges = [makeEdge({}), makeEdge({})];

    const metrics = computeDashboardMetrics(objects, edges);

    expect(metrics.totalObjects).toBe(3);
    expect(metrics.openObjects).toBe(2); // a + b (c is archived)
    expect(metrics.approvalsNeeded).toBe(2); // b + c
    expect(metrics.graphLinks).toBe(2);
    expect(metrics.byType).toEqual(
      expect.arrayContaining([
        { type: "memory", count: 1 },
        { type: "decision", count: 1 },
        { type: "research", count: 1 },
      ]),
    );
  });

  it("orders recent objects newest first and respects the limit", () => {
    const objects = [
      makeObject({ id: "old", createdAt: new Date("2026-06-01T00:00:00.000Z") }),
      makeObject({ id: "new", createdAt: new Date("2026-07-01T00:00:00.000Z") }),
      makeObject({ id: "mid", createdAt: new Date("2026-06-15T00:00:00.000Z") }),
    ];

    const metrics = computeDashboardMetrics(objects, [], { recentLimit: 2 });

    expect(metrics.recentObjects.map((object) => object.id)).toEqual(["new", "mid"]);
  });

  it("returns zeroed metrics for an empty tenant", () => {
    const metrics = computeDashboardMetrics([], []);

    expect(metrics.totalObjects).toBe(0);
    expect(metrics.openObjects).toBe(0);
    expect(metrics.approvalsNeeded).toBe(0);
    expect(metrics.graphLinks).toBe(0);
    expect(metrics.recentObjects).toEqual([]);
  });
});
