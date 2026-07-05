import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { createCognitiveObject } from "../src/lib/cognitive-object/service";
import type { EmbeddingProvider } from "../src/lib/ai/embeddings";
import { FakeEmbeddingProvider } from "../src/lib/ai/embeddings";

describe("createCognitiveObject", () => {
  it("stores an embedding computed from the object's title/objective/summary/body", async () => {
    const repository = new InMemoryCognitiveObjectRepository();
    const embeddingProvider = new FakeEmbeddingProvider();

    const { object } = await createCognitiveObject(
      repository,
      {
        tenantId: "tenant_a",
        createdByUserId: "user_1",
        objectType: "decision",
        title: "Adopt pgvector for semantic retrieval",
        objective: "Ground the Evolution Loop in similar past decisions.",
        source: "manual",
        riskLevel: "low",
        tags: [],
      },
      embeddingProvider,
    );

    // Embeddings are never part of the public CognitiveObject type -- assert
    // indirectly, via a semantic neighbor that should now be findable.
    const neighbor = await createCognitiveObject(
      repository,
      {
        tenantId: "tenant_a",
        createdByUserId: "user_1",
        objectType: "decision",
        title: "Adopt pgvector for semantic retrieval, revised",
        objective: "Ground the Evolution Loop in similar past decisions.",
        source: "manual",
        riskLevel: "low",
        tags: [],
      },
      embeddingProvider,
    );

    const matches = await repository.findSemanticNeighbors(object.id, "tenant_a", 5);
    expect(matches.map((m) => m.objectId)).toContain(neighbor.object.id);
  });

  it("degrades gracefully (null embedding, object still created) when the provider throws", async () => {
    const repository = new InMemoryCognitiveObjectRepository();
    const failingProvider: EmbeddingProvider = {
      embed: async () => {
        throw new Error("network error");
      },
    };

    const { object } = await createCognitiveObject(
      repository,
      {
        tenantId: "tenant_a",
        createdByUserId: "user_1",
        objectType: "decision",
        title: "Created despite a failed embedding call",
        source: "manual",
        riskLevel: "low",
        tags: [],
      },
      failingProvider,
    );

    expect(object.title).toBe("Created despite a failed embedding call");
    const neighbors = await repository.findSemanticNeighbors(object.id, "tenant_a", 5);
    expect(neighbors).toEqual([]);
  });

  it("still returns governance evaluation alongside the embedded object", async () => {
    const repository = new InMemoryCognitiveObjectRepository();
    const embeddingProvider = new FakeEmbeddingProvider();

    const result = await createCognitiveObject(
      repository,
      {
        tenantId: "tenant_a",
        createdByUserId: "user_1",
        objectType: "decision",
        title: "Critical risk decision",
        source: "manual",
        riskLevel: "critical",
        tags: [],
      },
      embeddingProvider,
    );

    expect(result.approvalRequired).toBe(true);
  });
});
