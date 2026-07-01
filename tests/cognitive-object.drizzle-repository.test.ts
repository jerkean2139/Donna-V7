import {
  toCognitiveObject,
  toCreateCognitiveObjectValues,
} from "../src/lib/cognitive-object/repository";

describe("drizzle cognitive object repository mapping", () => {
  it("builds insert values with tenant scope and defaults preserved", () => {
    const values = toCreateCognitiveObjectValues({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Adopt Drizzle persistence",
      source: "manual",
      riskLevel: "medium",
      tags: ["infra", "db"],
    });

    expect(values.tenantId).toBe("tenant_a");
    expect(values.createdByUserId).toBe("user_1");
    expect(values.objectType).toBe("decision");
    expect(values.summary).toBeNull();
    expect(values.body).toBeNull();
    expect(values.tags).toEqual(["infra", "db"]);
    expect(values.metadata).toEqual({});
  });

  it("maps a stored row back to a cognitive object", () => {
    const createdAt = new Date("2026-07-01T12:00:00.000Z");
    const updatedAt = new Date("2026-07-01T12:30:00.000Z");

    const object = toCognitiveObject({
      id: "22222222-2222-2222-2222-222222222222",
      tenantId: "tenant_a",
      projectId: null,
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Adopt Drizzle persistence",
      summary: "Wire Postgres behind an env flag.",
      body: null,
      status: "draft",
      source: "manual",
      riskLevel: "medium",
      confidenceScore: 70,
      tags: ["infra"],
      metadata: { origin: "test" },
      createdAt,
      updatedAt,
    });

    expect(object.tenantId).toBe("tenant_a");
    expect(object.status).toBe("draft");
    expect(object.tags).toEqual(["infra"]);
    expect(object.metadata).toEqual({ origin: "test" });
    expect(object.createdAt).toBe(createdAt);
    expect(object.updatedAt).toBe(updatedAt);
  });
});
