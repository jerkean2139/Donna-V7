import {
  canUseRelationshipForRecommendation,
  shouldRequireHumanConfirmation,
} from "./policy";
import type { CognitiveGraphEdge } from "./types";
import type {
  CognitiveGraphRepository,
  CreateCognitiveGraphEdgeRepositoryInput,
} from "./repository";
import type { CognitiveObjectRepository } from "../cognitive-object/repository";
import { DomainError } from "../errors";

export interface CognitiveGraphEdgeWithPolicy {
  edge: CognitiveGraphEdge;
  usableForRecommendation: boolean;
  confirmationRequired: boolean;
}

export async function createCognitiveGraphEdge(
  repository: CognitiveGraphRepository,
  objectRepository: CognitiveObjectRepository,
  input: CreateCognitiveGraphEdgeRepositoryInput,
): Promise<CognitiveGraphEdgeWithPolicy> {
  if (input.fromObjectId === input.toObjectId) {
    throw new DomainError("A Cognitive Object cannot be related to itself.");
  }

  // Tenant isolation: both endpoints must exist inside the caller's tenant.
  // Looking the objects up scoped by tenant (instead of trusting the IDs)
  // blocks cross-tenant references even when an attacker knows a foreign UUID.
  const [fromObject, toObject] = await Promise.all([
    objectRepository.findByIdForTenant(input.fromObjectId, input.tenantId),
    objectRepository.findByIdForTenant(input.toObjectId, input.tenantId),
  ]);

  if (!fromObject || !toObject) {
    throw new DomainError("Both Cognitive Objects must exist in the active tenant.");
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
