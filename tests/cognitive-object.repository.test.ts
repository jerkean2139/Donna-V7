import {
  clampListOptions,
  DEFAULT_LIST_LIMIT,
  InMemoryCognitiveObjectRepository,
  MAX_LIST_LIMIT,
} from "../src/lib/cognitive-object/repository";

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

  it("pages results with limit and offset", async () => {
    const repository = new InMemoryCognitiveObjectRepository();

    for (let index = 0; index < 5; index += 1) {
      await repository.create({
        tenantId: "tenant_a",
        createdByUserId: "user_1",
        objectType: "decision",
        title: `Object ${index}`,
        source: "manual",
        riskLevel: "low",
        tags: [],
      });
    }

    const pageOne = await repository.listByTenant("tenant_a", { limit: 2, offset: 0 });
    const pageTwo = await repository.listByTenant("tenant_a", { limit: 2, offset: 2 });
    const pageThree = await repository.listByTenant("tenant_a", { limit: 2, offset: 4 });

    expect(pageOne).toHaveLength(2);
    expect(pageTwo).toHaveLength(2);
    expect(pageThree).toHaveLength(1);

    const seen = new Set([...pageOne, ...pageTwo, ...pageThree].map((object) => object.id));
    expect(seen.size).toBe(5);
  });

  it("clamps list options to safe bounds", () => {
    expect(clampListOptions()).toEqual({ limit: DEFAULT_LIST_LIMIT, offset: 0 });
    expect(clampListOptions({ limit: 10_000, offset: -5 })).toEqual({
      limit: MAX_LIST_LIMIT,
      offset: 0,
    });
    expect(clampListOptions({ limit: 0 })).toEqual({ limit: 1, offset: 0 });
  });
});
