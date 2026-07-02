import { evaluateCognitiveObjectGovernance, defaultTenantGovernancePolicy } from "./governance";
import type { CognitiveObject } from "./types";
import type {
  CognitiveObjectRepository,
  CreateCognitiveObjectRepositoryInput,
  ListByTenantOptions,
} from "./repository";

export type CreateCognitiveObjectServiceInput = CreateCognitiveObjectRepositoryInput;

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
  options?: ListByTenantOptions,
): Promise<CognitiveObject[]> {
  return repository.listByTenant(tenantId, options);
}

export async function getTenantCognitiveObject(
  repository: CognitiveObjectRepository,
  id: string,
  tenantId: string,
): Promise<CognitiveObject | null> {
  return repository.findByIdForTenant(id, tenantId);
}
