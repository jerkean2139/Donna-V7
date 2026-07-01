import {
  toCognitiveGraphEdge,
  toCreateGraphEdgeValues,
} from "../src/lib/cognitive-graph/repository";

describe("drizzle cognitive graph repository mapping", () => {
  it("builds insert values with tenant scope and nullable actors", () => {
    const values = toCreateGraphEdgeValues({
      tenantId: "tenant_a",
      fromObjectId: "11111111-1111-1111-1111-111111111111",
      toObjectId: "33333333-3333-3333-3333-333333333333",
      relationshipType: "supports",
      strength: 80,
      source: "human",
      createdByUserId: "user_1",
    });

    expect(values.tenantId).toBe("tenant_a");
    expect(values.relationshipType).toBe("supports");
    expect(values.strength).toBe(80);
    expect(values.source).toBe("human");
    expect(values.createdByUserId).toBe("user_1");
    expect(values.createdByAgentId).toBeNull();
    expect(values.evidenceSummary).toBeNull();
  });

  it("maps a stored row back to a graph edge", () => {
    const createdAt = new Date("2026-07-01T12:00:00.000Z");

    const edge = toCognitiveGraphEdge({
      id: "22222222-2222-2222-2222-222222222222",
      tenantId: "tenant_a",
      fromObjectId: "11111111-1111-1111-1111-111111111111",
      toObjectId: "33333333-3333-3333-3333-333333333333",
      relationshipType: "supports",
      strength: 80,
      source: "human",
      createdByUserId: "user_1",
      createdByAgentId: null,
      evidenceSummary: "Cited in the decision record.",
      confirmedByUserId: null,
      confirmedAt: null,
      createdAt,
    });

    expect(edge.tenantId).toBe("tenant_a");
    expect(edge.fromObjectId).toBe("11111111-1111-1111-1111-111111111111");
    expect(edge.toObjectId).toBe("33333333-3333-3333-3333-333333333333");
    expect(edge.strength).toBe(80);
    expect(edge.evidenceSummary).toBe("Cited in the decision record.");
    expect(edge.createdAt).toBe(createdAt);
  });
});
