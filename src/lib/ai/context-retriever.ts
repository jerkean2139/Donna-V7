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

// Tier 1 retrieval per Phase 1 design: 1-hop Cognitive Graph neighbors,
// ranked by edge strength, filtered through the SAME trust policy the graph
// already uses for recommendations (canUseRelationshipForRecommendation) so
// an unconfirmed AI-inferred "contradicts"/"supersedes" edge cannot quietly
// feed the reasoning until a human confirms it.
//
// Tier 2 (semantic/pgvector retrieval merged in) is a documented follow-up,
// not implemented here: it requires a schema migration (embedding column)
// and an embeddings provider, and both need a real Postgres to verify against
// rather than the in-memory/mocked paths this test suite runs on. Ship graph
// retrieval now; add semantic as an additive merge into this same interface
// later without touching callers.
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
    }

    return items;
  }
}
