import { evaluateCognitiveObjectGovernance, defaultTenantGovernancePolicy } from "./governance";
import type { CognitiveObject } from "./types";
import type { CognitiveObjectRepository, CreateCognitiveObjectRepositoryInput } from "./repository";

export interface CreateCognitiveObjectServiceInput extends CreateCognitiveObjectRepositoryInput {}

export interface CognitiveObjectWithGovernance {
  object: CognitiveObject;
  approvalRequired: boolean;
  governanceReasons: string[];
}

export async function createCognitiveObject(
  repository: CognitiveObjectRepository,
  input: CreateCognitiveObjectServiceInput,
): Promise<CognitiveObjectWithGovernance> {
  const object = await repository.create(input);
  const governance = evaluateCognitiveObjectGovernance(object, defaultTenantGovernancePolicy);

  return {
    object,
    approvalRequired: governance.approvalRequired,
    governanceReasons: governance.reasons,
  };
}

export async function listTenantCognitiveObjects(
  repository: CognitiveObjectRepository,
  tenantId: string,
): Promise<CognitiveObject[]> {
  return repository.listByTenant(tenantId);
}

export async function getTenantCognitiveObject(
  repository: CognitiveObjectRepository,
  id: string,
  tenantId: string,
): Promise<CognitiveObject | null> {
  return repository.findByIdForTenant(id, tenantId);
}
