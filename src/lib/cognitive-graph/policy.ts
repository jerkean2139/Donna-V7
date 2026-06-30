import type { CognitiveGraphEdge, GraphTraversalRequest } from "./types";

export const DEFAULT_MIN_GRAPH_STRENGTH = 60;
export const DEFAULT_MAX_GRAPH_DEPTH = 1;
export const HIGH_TRUST_RELATIONSHIP_STRENGTH = 90;
export const HUMAN_CONFIRMED_RELATIONSHIP_STRENGTH = 100;

export function isHighTrustRelationship(edge: Pick<CognitiveGraphEdge, "strength" | "source" | "confirmedAt">): boolean {
  if (edge.confirmedAt) return true;
  if (edge.source === "human") return true;
  if (edge.source === "system_rule" && edge.strength >= HIGH_TRUST_RELATIONSHIP_STRENGTH) return true;
  return false;
}

export function canUseRelationshipForRecommendation(
  edge: Pick<CognitiveGraphEdge, "strength" | "source" | "confirmedAt">,
  minStrength = DEFAULT_MIN_GRAPH_STRENGTH,
): boolean {
  if (isHighTrustRelationship(edge)) return true;
  if (edge.source === "ai_inferred" && edge.strength < HIGH_TRUST_RELATIONSHIP_STRENGTH) return false;
  return edge.strength >= minStrength;
}

export function shouldRequireHumanConfirmation(edge: Pick<CognitiveGraphEdge, "strength" | "source" | "relationshipType">): boolean {
  if (edge.source !== "ai_inferred") return false;

  if (edge.relationshipType === "contradicts" || edge.relationshipType === "supersedes") {
    return true;
  }

  return edge.strength < HIGH_TRUST_RELATIONSHIP_STRENGTH;
}

export function normalizeTraversalRequest(request: GraphTraversalRequest): Required<GraphTraversalRequest> {
  return {
    tenantId: request.tenantId,
    objectId: request.objectId,
    maxDepth: request.maxDepth ?? DEFAULT_MAX_GRAPH_DEPTH,
    minStrength: request.minStrength ?? DEFAULT_MIN_GRAPH_STRENGTH,
    includeRelationshipTypes: request.includeRelationshipTypes ?? [],
    includeInferred: request.includeInferred ?? true,
  };
}

export function assertSameTenantRelationship(edge: Pick<CognitiveGraphEdge, "tenantId">, tenantId: string): void {
  if (edge.tenantId !== tenantId) {
    throw new Error("Cross-tenant graph relationship access blocked.");
  }
}
