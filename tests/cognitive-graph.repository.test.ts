import { InMemoryCognitiveGraphRepository } from "../src/lib/cognitive-graph/repository";
import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { createCognitiveGraphEdge, listCognitiveGraphEdgesForObject } from "../src/lib/cognitive-graph/service";
import type { CognitiveObject } from "../src/lib/cognitive-object/types";

async function seedObject(
  repository: InMemoryCognitiveObjectRepository,
  tenantId: string,
  title: string,
): Promise<CognitiveObject> {
  return repository.create({
    tenantId,
    createdByUserId: "user_1",
    objectType: "decision",
    title,
    source: "manual",
    riskLevel: "low",
    tags: [],
  });
}

describe("cognitive graph repository", () => {
  it("lists only relationships for the active tenant", async () => {
    const repository = new InMemoryCognitiveGraphRepository();

    await repository.createEdge({
      tenantId: "tenant_a",
      fromObjectId: "object_1",
      toObjectId: "object_2",
      relationshipType: "supports",
      strength: 100,
      source: "human",
      createdByUserId: "user_1",
    });

    await repository.createEdge({
      tenantId: "tenant_b",
      fromObjectId: "object_1",
      toObjectId: "object_3",
      relationshipType: "supports",
      strength: 100,
      source: "human",
      createdByUserId: "user_2",
    });

    const tenantAEdges = await repository.listEdgesForObject("object_1", "tenant_a");

    expect(tenantAEdges).toHaveLength(1);
    expect(tenantAEdges[0]?.toObjectId).toBe("object_2");
  });

  it("prevents self relationships in the service layer", async () => {
    const repository = new InMemoryCognitiveGraphRepository();
    const objectRepository = new InMemoryCognitiveObjectRepository();
    const object = await seedObject(objectRepository, "tenant_a", "Self target");

    await expect(
      createCognitiveGraphEdge(repository, objectRepository, {
        tenantId: "tenant_a",
        fromObjectId: object.id,
        toObjectId: object.id,
        relationshipType: "supports",
        strength: 100,
        source: "human",
      }),
    ).rejects.toThrow("A Cognitive Object cannot be related to itself.");
  });

  it("returns relationships through the service layer", async () => {
    const repository = new InMemoryCognitiveGraphRepository();
    const objectRepository = new InMemoryCognitiveObjectRepository();
    const from = await seedObject(objectRepository, "tenant_a", "From object");
    const to = await seedObject(objectRepository, "tenant_a", "To object");

    await createCognitiveGraphEdge(repository, objectRepository, {
      tenantId: "tenant_a",
      fromObjectId: from.id,
      toObjectId: to.id,
      relationshipType: "depends_on",
      strength: 90,
      source: "human",
    });

    const edges = await listCognitiveGraphEdgesForObject(repository, from.id, "tenant_a");

    expect(edges).toHaveLength(1);
    expect(edges[0]?.relationshipType).toBe("depends_on");
  });

  it("blocks edges that reference another tenant's object", async () => {
    const repository = new InMemoryCognitiveGraphRepository();
    const objectRepository = new InMemoryCognitiveObjectRepository();
    const mine = await seedObject(objectRepository, "tenant_a", "Tenant A decision");
    const foreign = await seedObject(objectRepository, "tenant_b", "Tenant B secret");

    // Attacker in tenant_a knows tenant_b's object UUID and tries to link to it.
    await expect(
      createCognitiveGraphEdge(repository, objectRepository, {
        tenantId: "tenant_a",
        fromObjectId: mine.id,
        toObjectId: foreign.id,
        relationshipType: "references",
        strength: 80,
        source: "human",
      }),
    ).rejects.toThrow("Both Cognitive Objects must exist in the active tenant.");

    // Reverse direction must fail too.
    await expect(
      createCognitiveGraphEdge(repository, objectRepository, {
        tenantId: "tenant_a",
        fromObjectId: foreign.id,
        toObjectId: mine.id,
        relationshipType: "references",
        strength: 80,
        source: "human",
      }),
    ).rejects.toThrow("Both Cognitive Objects must exist in the active tenant.");

    const edges = await listCognitiveGraphEdgesForObject(repository, mine.id, "tenant_a");
    expect(edges).toHaveLength(0);
  });

  it("counts edges per tenant only", async () => {
    const repository = new InMemoryCognitiveGraphRepository();

    await repository.createEdge({
      tenantId: "tenant_a",
      fromObjectId: "object_1",
      toObjectId: "object_2",
      relationshipType: "supports",
      strength: 80,
      source: "human",
    });
    await repository.createEdge({
      tenantId: "tenant_b",
      fromObjectId: "object_3",
      toObjectId: "object_4",
      relationshipType: "supports",
      strength: 80,
      source: "human",
    });

    expect(await repository.countEdgesForTenant("tenant_a")).toBe(1);
    expect(await repository.countEdgesForTenant("tenant_b")).toBe(1);
    expect(await repository.countEdgesForTenant("tenant_c")).toBe(0);
  });

  it("blocks edges when either object does not exist", async () => {
    const repository = new InMemoryCognitiveGraphRepository();
    const objectRepository = new InMemoryCognitiveObjectRepository();
    const mine = await seedObject(objectRepository, "tenant_a", "Tenant A decision");

    await expect(
      createCognitiveGraphEdge(repository, objectRepository, {
        tenantId: "tenant_a",
        fromObjectId: mine.id,
        toObjectId: crypto.randomUUID(),
        relationshipType: "supports",
        strength: 70,
        source: "human",
      }),
    ).rejects.toThrow("Both Cognitive Objects must exist in the active tenant.");
  });
});
