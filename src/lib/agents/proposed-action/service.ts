import type { CognitiveGraphRepository } from "../../cognitive-graph/repository";
import { defaultTenantGovernancePolicy, type TenantGovernancePolicy } from "../../cognitive-object/governance";
import type { CognitiveObjectRepository } from "../../cognitive-object/repository";
import type { RiskLevel } from "../../cognitive-object/types";
import { DomainError } from "../../errors";
import { errorField, logger } from "../../logger";
import type { AgentRunRepository } from "../agent-run/repository";
import type { ProposedActionDraft } from "../types";
import { CreateFollowupObjectExecutor, FakeSendEmailExecutor, type ActionExecutor } from "./executors";
import { evaluateProposedActionGovernance } from "./governance";
import type { ProposedActionRepository } from "./repository";
import type { ProposedAction } from "./types";

function getActionExecutor(
  toolName: string,
  deps: {
    objectRepository: CognitiveObjectRepository;
    graphRepository: CognitiveGraphRepository;
    agentName: string;
  },
): ActionExecutor | undefined {
  switch (toolName) {
    case "create_followup_object":
      return new CreateFollowupObjectExecutor(deps.objectRepository, deps.graphRepository, deps.agentName);
    case "send_email":
      return new FakeSendEmailExecutor();
    default:
      return undefined;
  }
}

async function runExecutor(
  action: ProposedAction,
  repository: ProposedActionRepository,
  agentName: string,
  deps: { objectRepository: CognitiveObjectRepository; graphRepository: CognitiveGraphRepository },
  decidedByUserId: string | null,
): Promise<ProposedAction> {
  const executor = getActionExecutor(action.toolName, { ...deps, agentName });
  if (!executor) {
    return repository.updateStatus({
      id: action.id,
      tenantId: action.tenantId,
      status: "failed",
      decidedByUserId,
      resultSummary: `No executor registered for tool "${action.toolName}".`,
    });
  }

  try {
    const result = await executor.execute(action);
    return repository.updateStatus({
      id: action.id,
      tenantId: action.tenantId,
      status: result.success ? "executed" : "failed",
      decidedByUserId,
      resultSummary: result.resultSummary,
    });
  } catch (error) {
    logger.error("proposed_action.execution_failed", {
      tenantId: action.tenantId,
      actionId: action.id,
      toolName: action.toolName,
      error: errorField(error),
    });
    return repository.updateStatus({
      id: action.id,
      tenantId: action.tenantId,
      status: "failed",
      decidedByUserId,
      resultSummary: `Execution error: ${errorField(error)}`,
    });
  }
}

export interface CreateProposedActionContext {
  tenantId: string;
  agentRunId: string;
  agentName: string;
  objectId: string;
  objectRiskLevel: RiskLevel;
  confidenceScore: number | null;
}

// Creates the ProposedAction, runs governance, and -- only when governance
// clears it for auto-execution (Phase 2 design, Decision 3: low risk,
// reversible, confidence above threshold) -- executes it immediately.
// Everything else stays in "proposed" until a human decides.
export async function createProposedActionFromDraft(
  repository: ProposedActionRepository,
  draft: ProposedActionDraft,
  context: CreateProposedActionContext,
  deps: { objectRepository: CognitiveObjectRepository; graphRepository: CognitiveGraphRepository },
  policy: TenantGovernancePolicy = defaultTenantGovernancePolicy,
): Promise<ProposedAction> {
  const governance = evaluateProposedActionGovernance(
    {
      toolRiskLevel: draft.riskLevel,
      reversible: draft.reversible,
      objectRiskLevel: context.objectRiskLevel,
      confidenceScore: context.confidenceScore,
    },
    policy,
  );

  const action = await repository.create({
    tenantId: context.tenantId,
    agentRunId: context.agentRunId,
    objectId: context.objectId,
    toolName: draft.toolName,
    args: draft.args,
    description: draft.description,
    effectiveRiskLevel: governance.effectiveRiskLevel,
    reversible: draft.reversible,
    approvalRequired: governance.approvalRequired,
    approvalReason: governance.reasons.join(" ") || null,
  });

  if (!governance.allowedToAutoExecute) {
    return action;
  }

  return runExecutor(action, repository, context.agentName, deps, null);
}

export interface DecideProposedActionInput {
  id: string;
  tenantId: string;
  userId: string;
}

// Approving and executing are one step in Phase 2 PR1 (deliberate
// simplification, not an oversight): a human's approval IS the decision to
// act, so there is no separate "approved but not yet executed" limbo state
// for this pass. Splitting them apart is straightforward to add later if a
// review-then-schedule workflow is needed.
export async function approveAndExecuteProposedAction(
  repository: ProposedActionRepository,
  agentRunRepository: AgentRunRepository,
  input: DecideProposedActionInput,
  deps: { objectRepository: CognitiveObjectRepository; graphRepository: CognitiveGraphRepository },
): Promise<ProposedAction> {
  const action = await repository.findByIdForTenant(input.id, input.tenantId);
  if (!action) {
    throw new DomainError("Proposed action not found for active tenant.");
  }
  if (action.status !== "proposed") {
    throw new DomainError(`Proposed action has already been ${action.status}.`);
  }

  const run = await agentRunRepository.findByIdForTenant(action.agentRunId, input.tenantId);
  if (!run) {
    throw new DomainError("The agent run for this proposed action was not found for active tenant.");
  }

  return runExecutor(action, repository, run.agentName, deps, input.userId);
}

export async function rejectProposedAction(
  repository: ProposedActionRepository,
  input: DecideProposedActionInput,
): Promise<ProposedAction> {
  const action = await repository.findByIdForTenant(input.id, input.tenantId);
  if (!action) {
    throw new DomainError("Proposed action not found for active tenant.");
  }
  if (action.status !== "proposed") {
    throw new DomainError(`Proposed action has already been ${action.status}.`);
  }

  return repository.updateStatus({
    id: action.id,
    tenantId: action.tenantId,
    status: "rejected",
    decidedByUserId: input.userId,
  });
}
