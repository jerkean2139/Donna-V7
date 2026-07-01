import {
  canUseRelationshipForRecommendation,
  shouldRequireHumanConfirmation,
} from "./policy";
import type { CognitiveGraphEdge } from "./types";
import type {
  CognitiveGraphRepository,
  CreateCognitiveGraphEdgeRepositoryInput,
} from "./repository";

export interface CognitiveGraphEdgeWithPolicy {
  edge: CognitiveGraphEdge;
  usableForRecommendation: boolean;
  confirmationRequired: boolean;
}

export async function createCognitiveGraphEdge(
  repository: CognitiveGraphRepository,
  input: CreateCognitiveGraphEdgeRepositoryInput,
): Promise<CognitiveGraphEdgeWithPolicy> {
  if (input.fromObjectId === input.toObjectId) {
    throw new Error("A Cognitive Object cannot be related to itself.");
  }

  const edge = await repository.createEdge(input);

  return {
    edge,
    usableForRecommendation: canUseRelationshipForRecommendation(edge),
    confirmationRequired: shouldRequireHumanConfirmation(edge),
  };
}

export async function listCognitiveGraphEdgesForObject(
  repository: CognitiveGraphRepository,
  objectId: string,
  tenantId: string,
): Promise<CognitiveGraphEdge[]> {
  return repository.listEdgesForObject(objectId, tenantId);
}
