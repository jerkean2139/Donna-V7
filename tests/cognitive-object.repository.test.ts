import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";

describe("cognitive object repository", () => {
  it("lists only objects for the active tenant", async () => {
    const repository = new InMemoryCognitiveObjectRepository();

    await repository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Tenant A decision",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    await repository.create({
      tenantId: "tenant_b",
      createdByUserId: "user_2",
      objectType: "decision",
      title: "Tenant B decision",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const tenantAObjects = await repository.listByTenant("tenant_a");

    expect(tenantAObjects).toHaveLength(1);
    expect(tenantAObjects[0]?.title).toBe("Tenant A decision");
  });

  it("does not return an object across tenant boundaries", async () => {
    const repository = new InMemoryCognitiveObjectRepository();

    const created = await repository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "research",
      title: "Private research",
      source: "manual",
      riskLevel: "medium",
      tags: [],
    });

    const result = await repository.findByIdForTenant(created.id, "tenant_b");

    expect(result).toBeNull();
  });
});
