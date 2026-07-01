import {
  defaultTenantGovernancePolicy,
  evaluateCognitiveObjectGovernance,
} from "../cognitive-object/governance";
import type { CognitiveObject } from "../cognitive-object/types";
import type { CognitiveObjectRepository } from "../cognitive-object/repository";
import type { EvolutionLoopRunRepository } from "./repository";
import { scoreEvolutionLoopRelease } from "./scoring";
import type { CreateEvolutionLoopRunInput, EvolutionLoopRun } from "./types";

function calculateMvpConfidenceScore(object: CognitiveObject): number {
  let score = 45;

  if (object.summary) score += 15;
  if (object.body) score += 15;
  if ((object.tags?.length ?? 0) > 0) score += 5;
  if (object.riskLevel === "low") score += 10;
  if (object.riskLevel === "medium") score += 5;
  if (object.riskLevel === "critical") score -= 10;

  return Math.max(0, Math.min(95, score));
}

function buildRunDraft(object: CognitiveObject): CreateEvolutionLoopRunInput {
  const confidenceScore = object.confidenceScore ?? calculateMvpConfidenceScore(object);
  const governance = evaluateCognitiveObjectGovernance(
    { ...object, confidenceScore },
    defaultTenantGovernancePolicy,
  );

  const contextSummary = object.body
    ? `Used the stored Cognitive Object body, summary, tags, risk level, and object type as MVP context.`
    : `Used the stored Cognitive Object metadata and summary as MVP context. No full body was provided.`;

  const recommendation = governance.approvalRequired
    ? "Keep this Cognitive Object in human review until the approval reasons are resolved."
    : "Treat this Cognitive Object as ready for low-risk follow-through with outcome learning after execution.";

  const candidate: Omit<CreateEvolutionLoopRunInput, "tenantId" | "objectId"> = {
    intentSummary: `Clarify and improve the quality of: ${object.title}`,
    contextSummary,
    assumptions: [
      {
        text: "The stored Cognitive Object contains the best available MVP context for this run.",
        riskLevel: object.body ? "low" : "medium",
        needsVerification: !object.body,
      },
    ],
    optionsConsidered: [
      {
        name: "Proceed with current context",
        summary: "Use the object as captured and apply governance immediately.",
        tradeoffs: ["Fastest path", "May miss external memory not yet connected"],
      },
      {
        name: "Request more context",
        summary: "Hold execution until the human adds more evidence or source material.",
        tradeoffs: ["Improves confidence", "Slows delivery"],
      },
    ],
    critique: [
      {
        lens: "operator",
        concern: "The MVP loop can only reason from stored object context until memory retrieval expands.",
      },
    ],
    risks: [
      {
        riskLevel: object.riskLevel,
        summary: `The object is marked ${object.riskLevel} risk.`,
        mitigation: governance.approvalRequired
          ? "Route through human approval before action."
          : "Proceed only with reversible, internal actions.",
      },
    ],
    recommendation,
    confidenceScore,
    approvalRequired: governance.approvalRequired,
    approvalReason: governance.reasons.join(" ") || null,
  };

  const release = scoreEvolutionLoopRelease(candidate);

  return {
    tenantId: object.tenantId,
    objectId: object.id,
    ...candidate,
    releaseScore: release.totalScore,
    releaseScoreBreakdown: release.breakdown,
  };
}

export async function startEvolutionLoopForObject(
  objectRepository: CognitiveObjectRepository,
  loopRepository: EvolutionLoopRunRepository,
  input: { objectId: string; tenantId: string },
): Promise<EvolutionLoopRun> {
  const object = await objectRepository.findByIdForTenant(input.objectId, input.tenantId);

  if (!object) {
    throw new Error("Cognitive Object not found for active tenant.");
  }

  return loopRepository.create(buildRunDraft(object));
}

export async function listEvolutionLoopRunsForObject(
  loopRepository: EvolutionLoopRunRepository,
  input: { objectId: string; tenantId: string },
): Promise<EvolutionLoopRun[]> {
  return loopRepository.listByObjectForTenant(input.objectId, input.tenantId);
}
