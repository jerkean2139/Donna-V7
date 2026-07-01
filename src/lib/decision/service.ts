import type { CognitiveObject } from "../cognitive-object/types";
import type { CognitiveObjectRepository } from "../cognitive-object/repository";
import type { EvolutionLoopRun } from "../evolution-loop/types";
import type { EvolutionLoopRunRepository } from "../evolution-loop/repository";
import type { DecisionObjectView } from "./types";

export const DECISION_OBJECT_TYPE = "decision" as const;

export function isDecisionObject(object: CognitiveObject): boolean {
  return object.objectType === DECISION_OBJECT_TYPE;
}

// Compose a Decision Object view from a cognitive object and its loop runs.
// `loopRuns` is expected newest-first (as the repository returns them); the
// first entry, if any, supplies the current reasoning snapshot.
export function assembleDecisionObject(
  object: CognitiveObject,
  loopRuns: EvolutionLoopRun[],
): DecisionObjectView {
  const latest = loopRuns[0] ?? null;

  return {
    id: object.id,
    tenantId: object.tenantId,
    projectId: object.projectId ?? null,
    createdByUserId: object.createdByUserId,
    title: object.title,
    objective: object.objective ?? null,
    status: object.status,
    riskLevel: object.riskLevel,
    confidenceScore: object.confidenceScore ?? null,

    hiddenGoal: latest?.hiddenGoal ?? null,
    contextSummary: latest?.contextSummary ?? null,
    assumptions: latest?.assumptions ?? [],
    optionsConsidered: latest?.optionsConsidered ?? [],
    critique: latest?.critique ?? [],
    risks: latest?.risks ?? [],
    recommendation: latest?.recommendation ?? null,
    approvalRequired: latest?.approvalRequired ?? false,
    approvalReason: latest?.approvalReason ?? null,

    loopRunCount: loopRuns.length,
    latestLoopRunAt: latest?.createdAt ?? null,

    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
  };
}

// Fetch a single tenant-scoped Decision Object view. Returns null when the
// object does not exist for the tenant or is not a `decision` type.
export async function getDecisionObjectForTenant(
  objectRepository: CognitiveObjectRepository,
  loopRepository: EvolutionLoopRunRepository,
  id: string,
  tenantId: string,
): Promise<DecisionObjectView | null> {
  const object = await objectRepository.findByIdForTenant(id, tenantId);

  if (!object || !isDecisionObject(object)) {
    return null;
  }

  const loopRuns = await loopRepository.listByObjectForTenant(id, tenantId);
  return assembleDecisionObject(object, loopRuns);
}

// List all Decision Objects for a tenant (cognitive objects of type decision).
export async function listTenantDecisionObjects(
  objectRepository: CognitiveObjectRepository,
  tenantId: string,
): Promise<CognitiveObject[]> {
  const objects = await objectRepository.listByTenant(tenantId);
  return objects.filter(isDecisionObject);
}
