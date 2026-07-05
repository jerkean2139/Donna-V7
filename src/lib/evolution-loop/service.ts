import type { ContextRetriever } from "../ai/context-retriever";
import type { ReasoningEngine, ReasoningOutput } from "../ai/types";
import {
  defaultTenantGovernancePolicy,
  evaluateCognitiveObjectGovernance,
} from "../cognitive-object/governance";
import { errorField, logger } from "../logger";
import type { CognitiveObject } from "../cognitive-object/types";
import type { CognitiveObjectRepository } from "../cognitive-object/repository";
import type { EvolutionLoopRunRepository } from "./repository";
import { scoreEvolutionLoopRelease } from "./scoring";
import type { CreateEvolutionLoopRunInput, EvolutionLoopRun } from "./types";

// If the model cited no retrieved context for ANY assumption or risk, its
// reasoning rests entirely on the object's own content with nothing to
// cross-check. Confidence is capped here, before governance ever sees it, so
// "no evidence" is mechanically incapable of clearing the auto-execute
// threshold (Phase 1 design, Decision 6).
const NO_EVIDENCE_CONFIDENCE_CAP = 60;

function applyEvidenceDiscount(output: ReasoningOutput): number {
  const hasCitedEvidence =
    output.assumptions.some((a) => a.sourceObjectIds.length > 0) ||
    output.risks.some((r) => r.sourceObjectIds.length > 0);

  return hasCitedEvidence
    ? output.suggestedConfidence
    : Math.min(output.suggestedConfidence, NO_EVIDENCE_CONFIDENCE_CAP);
}

async function buildRunDraft(
  reasoningEngine: ReasoningEngine,
  contextRetriever: ContextRetriever,
  object: CognitiveObject,
): Promise<CreateEvolutionLoopRunInput> {
  const context = await contextRetriever.retrieveContextForObject({
    objectId: object.id,
    tenantId: object.tenantId,
  });

  const reasoning = await reasoningEngine.reasonAboutObject({
    object: {
      id: object.id,
      objectType: object.objectType,
      title: object.title,
      objective: object.objective ?? null,
      summary: object.summary ?? null,
      body: object.body ?? null,
      riskLevel: object.riskLevel,
      tags: object.tags ?? [],
    },
    context,
  });

  // Audit trail: the full reasoning output including per-claim provenance
  // (sourceObjectIds) is logged here even though the persisted run schema
  // does not yet have a provenance column (Phase 2 follow-up per the
  // consolidation plan's Loop memory-event writeback). This keeps the
  // citation data recoverable from logs without a DB migration in Phase 1.
  logger.info("evolution_loop.reasoning_generated", {
    tenantId: object.tenantId,
    objectId: object.id,
    contextItemCount: context.length,
    citedAssumptionCount: reasoning.assumptions.filter((a) => a.sourceObjectIds.length > 0).length,
    citedRiskCount: reasoning.risks.filter((r) => r.sourceObjectIds.length > 0).length,
    suggestedConfidence: reasoning.suggestedConfidence,
  });

  // Trust boundary (Phase 1 design, Decision 1): the model's suggested
  // confidence — after the evidence discount, never before it — is the ONLY
  // thing governance evaluates. The model has no other path to influence
  // whether human approval is required; it cannot report "no approval
  // needed" and have that respected.
  const confidenceScore = applyEvidenceDiscount(reasoning);

  const governance = evaluateCognitiveObjectGovernance(
    { ...object, confidenceScore },
    defaultTenantGovernancePolicy,
  );

  const candidate: Omit<CreateEvolutionLoopRunInput, "tenantId" | "objectId"> = {
    intentSummary: reasoning.intentSummary,
    contextSummary: reasoning.contextSummary,
    assumptions: reasoning.assumptions.map(({ sourceObjectIds: _sourceObjectIds, ...rest }) => rest),
    optionsConsidered: reasoning.optionsConsidered,
    critique: reasoning.critique,
    risks: reasoning.risks.map(({ sourceObjectIds: _sourceObjectIds, ...rest }) => rest),
    recommendation: reasoning.recommendation,
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
  reasoningEngine: ReasoningEngine,
  contextRetriever: ContextRetriever,
  input: { objectId: string; tenantId: string },
): Promise<EvolutionLoopRun> {
  const object = await objectRepository.findByIdForTenant(input.objectId, input.tenantId);

  if (!object) {
    throw new Error("Cognitive Object not found for active tenant.");
  }

  try {
    const draft = await buildRunDraft(reasoningEngine, contextRetriever, object);
    return loopRepository.create(draft);
  } catch (error) {
    logger.error("evolution_loop.reasoning_failed", {
      tenantId: input.tenantId,
      objectId: input.objectId,
      error: errorField(error),
    });
    throw error;
  }
}

export async function listEvolutionLoopRunsForObject(
  loopRepository: EvolutionLoopRunRepository,
  input: { objectId: string; tenantId: string },
): Promise<EvolutionLoopRun[]> {
  return loopRepository.listByObjectForTenant(input.objectId, input.tenantId);
}
