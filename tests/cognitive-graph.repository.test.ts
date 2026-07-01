import { InMemoryCognitiveGraphRepository } from "../src/lib/cognitive-graph/repository";
import { createCognitiveGraphEdge, listCognitiveGraphEdgesForObject } from "../src/lib/cognitive-graph/service";

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

    await expect(
      createCognitiveGraphEdge(repository, {
        tenantId: "tenant_a",
        fromObjectId: "object_1",
        toObjectId: "object_1",
        relationshipType: "supports",
        strength: 100,
        source: "human",
      }),
    ).rejects.toThrow("A Cognitive Object cannot be related to itself.");
  });

  it("returns relationships through the service layer", async () => {
    const repository = new InMemoryCognitiveGraphRepository();

    await createCognitiveGraphEdge(repository, {
      tenantId: "tenant_a",
      fromObjectId: "object_1",
      toObjectId: "object_2",
      relationshipType: "depends_on",
      strength: 90,
      source: "human",
    });

    const edges = await listCognitiveGraphEdgesForObject(repository, "object_1", "tenant_a");

    expect(edges).toHaveLength(1);
    expect(edges[0]?.relationshipType).toBe("depends_on");
  });

  it("lists all edges for a tenant across objects", async () => {
    const repository = new InMemoryCognitiveGraphRepository();

    await repository.createEdge({
      tenantId: "tenant_a",
      fromObjectId: "object_1",
      toObjectId: "object_2",
      relationshipType: "supports",
      strength: 100,
      source: "human",
    });
    await repository.createEdge({
      tenantId: "tenant_a",
      fromObjectId: "object_3",
      toObjectId: "object_4",
      relationshipType: "depends_on",
      strength: 80,
      source: "human",
    });
    await repository.createEdge({
      tenantId: "tenant_b",
      fromObjectId: "object_5",
      toObjectId: "object_6",
      relationshipType: "supports",
      strength: 100,
      source: "human",
    });

    const tenantAEdges = await repository.listByTenant("tenant_a");

    expect(tenantAEdges).toHaveLength(2);
    expect(tenantAEdges.every((edge) => edge.tenantId === "tenant_a")).toBe(true);
  });
});
