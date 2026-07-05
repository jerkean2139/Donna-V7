import { canUseRelationshipForRecommendation } from "../cognitive-graph/policy";
import type { CognitiveGraphRepository } from "../cognitive-graph/repository";
import type { CognitiveObjectRepository } from "../cognitive-object/repository";
import type { RetrievedContextItem } from "./types";

const DEFAULT_TOP_K = 8;

export interface ContextRetriever {
  retrieveContextForObject(input: {
    objectId: string;
    tenantId: string;
    topK?: number;
  }): Promise<RetrievedContextItem[]>;
}

// Tier 1: 1-hop Cognitive Graph neighbors, ranked by edge strength, filtered
// through the SAME trust policy the graph already uses for recommendations
// (canUseRelationshipForRecommendation) so an unconfirmed AI-inferred
// "contradicts"/"supersedes" edge cannot quietly feed the reasoning until a
// human confirms it.
//
// Tier 2: pgvector cosine-nearest neighbors from
// CognitiveObjectRepository.findSemanticNeighbors, scoped to the same
// tenant. Merged into the same result set per Phase 1 Decision 4 ("the
// retriever merges graph neighbors ∪ semantic matches, dedups, caps at K"):
// graph neighbors are kept as-is (they carry a real, human-legible
// relationship); semantic matches fill any remaining slots up to topK,
// skipping objects already surfaced by the graph. In-memory mode still
// works end-to-end here -- InMemoryCognitiveObjectRepository implements
// findSemanticNeighbors too -- so this tier needs no live Postgres to test,
// only an embedding on both objects (which the fake provider always
// produces).
export class GraphContextRetriever implements ContextRetriever {
  constructor(
    private readonly graphRepository: CognitiveGraphRepository,
    private readonly objectRepository: CognitiveObjectRepository,
  ) {}

  async retrieveContextForObject(input: {
    objectId: string;
    tenantId: string;
    topK?: number;
  }): Promise<RetrievedContextItem[]> {
    const topK = input.topK ?? DEFAULT_TOP_K;

    const [outgoing, incoming] = await Promise.all([
      this.graphRepository.listOutgoingEdges(input.objectId, input.tenantId),
      this.graphRepository.listIncomingEdges(input.objectId, input.tenantId),
    ]);

    const usableEdges = [...outgoing, ...incoming]
      .filter((edge) => canUseRelationshipForRecommendation(edge))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, topK);

    const neighborIds = usableEdges.map((edge) =>
      edge.fromObjectId === input.objectId ? edge.toObjectId : edge.fromObjectId,
    );

    const neighbors = await Promise.all(
      neighborIds.map((id) => this.objectRepository.findByIdForTenant(id, input.tenantId)),
    );

    const items: RetrievedContextItem[] = [];
    const seenObjectIds = new Set<string>();

    for (let i = 0; i < usableEdges.length; i += 1) {
      const neighbor = neighbors[i];
      if (!neighbor) continue; // tenant mismatch or deleted; skip rather than fail the whole run

      items.push({
        objectId: neighbor.id,
        objectType: neighbor.objectType,
        title: neighbor.title,
        summary: neighbor.summary ?? null,
        relationshipType: usableEdges[i]?.relationshipType ?? null,
        strength: usableEdges[i]?.strength ?? null,
        retrievalMethod: "graph",
      });
      seenObjectIds.add(neighbor.id);
    }

    const remainingSlots = topK - items.length;
    if (remainingSlots > 0) {
      const semanticNeighbors = await this.objectRepository.findSemanticNeighbors(
        input.objectId,
        input.tenantId,
        remainingSlots + seenObjectIds.size, // over-fetch so de-duping doesn't leave slots unfilled
      );

      for (const match of semanticNeighbors) {
        if (items.length >= topK) break;
        if (seenObjectIds.has(match.objectId)) continue;

        const object = await this.objectRepository.findByIdForTenant(match.objectId, input.tenantId);
        if (!object) continue;

        items.push({
          objectId: object.id,
          objectType: object.objectType,
          title: object.title,
          summary: object.summary ?? null,
          relationshipType: null,
          strength: Math.round(match.similarity * 100),
          retrievalMethod: "semantic",
        });
        seenObjectIds.add(object.id);
      }
    }

    return items;
  }
}
