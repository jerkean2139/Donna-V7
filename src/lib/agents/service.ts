import type { CognitiveGraphRepository } from "../cognitive-graph/repository";
import type { CognitiveObjectRepository } from "../cognitive-object/repository";
import { DomainError } from "../errors";
import type { CredentialRepository } from "../integrations/credentials/repository";
import { errorField, logger } from "../logger";
import type { AgentRun } from "./agent-run/types";
import type { AgentRunRepository } from "./agent-run/repository";
import { createProposedActionFromDraft } from "./proposed-action/service";
import type { ProposedActionRepository } from "./proposed-action/repository";
import type { ProposedAction } from "./proposed-action/types";
import { AGENT_REGISTRY, routeToAgent } from "./registry";
import type { AgentEngine, AgentRunOutput } from "./types";

// Orchestrator-enforced, not model-driven (Phase 2 design, Decision 4): the
// depth counter is a plain recursion parameter this function controls, not
// a value the model can influence. A prompt injection cannot cause unbounded
// delegation because the model never holds the recursion -- this function does.
export const MAX_DELEGATION_DEPTH = 2;

export interface AgentServiceDeps {
  objectRepository: CognitiveObjectRepository;
  graphRepository: CognitiveGraphRepository;
  credentialRepository: CredentialRepository;
  agentRunRepository: AgentRunRepository;
  proposedActionRepository: ProposedActionRepository;
  agentEngine: AgentEngine;
}

export interface StartAgentTaskInput {
  task: string;
  tenantId: string;
  objectId: string;
  // Explicit agent selection bypasses keyword routing. When omitted, the
  // task is routed via routeToAgent (Phase 2 design, Decision 8: keyword
  // routing now, semantic routing when pgvector lands).
  agentName?: string;
}

export interface StartAgentTaskResult {
  run: AgentRun;
  proposedActions: ProposedAction[];
  // Non-null only when this run requested a delegation AND depth allowed it
  // to actually run. A delegation request beyond MAX_DELEGATION_DEPTH, or to
  // an unknown agent, is logged and dropped -- the run's own result still
  // returns normally.
  delegatedResult: StartAgentTaskResult | null;
}

export async function startAgentTask(
  deps: AgentServiceDeps,
  input: StartAgentTaskInput,
  depth = 0,
): Promise<StartAgentTaskResult> {
  const object = await deps.objectRepository.findByIdForTenant(input.objectId, input.tenantId);
  if (!object) {
    throw new DomainError("Cognitive Object not found for active tenant.");
  }

  const agentName = input.agentName ?? routeToAgent(input.task) ?? undefined;
  if (!agentName || !AGENT_REGISTRY[agentName]) {
    throw new DomainError(
      input.agentName
        ? `Unknown agent: ${input.agentName}`
        : "No agent matched this task. Try a more specific task description.",
    );
  }

  let output: AgentRunOutput;
  try {
    output = await deps.agentEngine.runAgentTask({
      agentName,
      task: input.task,
      tenantId: input.tenantId,
      objectId: input.objectId,
      objectRiskLevel: object.riskLevel,
      objectConfidenceScore: object.confidenceScore ?? null,
    });
  } catch (error) {
    await deps.agentRunRepository.create({
      tenantId: input.tenantId,
      objectId: input.objectId,
      agentName,
      task: input.task,
      status: "failed",
    });
    logger.error("agent_run.failed", {
      tenantId: input.tenantId,
      objectId: input.objectId,
      agentName,
      error: errorField(error),
    });
    throw error;
  }

  const run = await deps.agentRunRepository.create({
    tenantId: input.tenantId,
    objectId: input.objectId,
    agentName,
    task: input.task,
    status: "completed",
    responseText: output.responseText,
    toolCalls: output.toolCalls,
    delegationRequest: output.delegationRequest,
  });

  const proposedActions: ProposedAction[] = [];
  for (const draft of output.proposedActions) {
    const action = await createProposedActionFromDraft(
      deps.proposedActionRepository,
      draft,
      {
        tenantId: input.tenantId,
        agentRunId: run.id,
        agentName,
        objectId: input.objectId,
        objectRiskLevel: object.riskLevel,
        confidenceScore: object.confidenceScore ?? null,
      },
      {
        objectRepository: deps.objectRepository,
        graphRepository: deps.graphRepository,
        credentialRepository: deps.credentialRepository,
      },
    );
    proposedActions.push(action);
  }

  logger.info("agent_run.completed", {
    tenantId: input.tenantId,
    objectId: input.objectId,
    agentName,
    runId: run.id,
    proposedActionCount: proposedActions.length,
    hasDelegationRequest: Boolean(output.delegationRequest),
    depth,
  });

  let delegatedResult: StartAgentTaskResult | null = null;
  if (output.delegationRequest) {
    if (depth >= MAX_DELEGATION_DEPTH) {
      logger.warn("agent_run.delegation_depth_exceeded", {
        tenantId: input.tenantId,
        objectId: input.objectId,
        fromAgent: agentName,
        requestedAgent: output.delegationRequest.agentName,
        depth,
      });
    } else if (!AGENT_REGISTRY[output.delegationRequest.agentName]) {
      logger.warn("agent_run.delegation_unknown_agent", {
        tenantId: input.tenantId,
        objectId: input.objectId,
        fromAgent: agentName,
        requestedAgent: output.delegationRequest.agentName,
      });
    } else {
      delegatedResult = await startAgentTask(
        deps,
        {
          task: output.delegationRequest.task,
          tenantId: input.tenantId,
          objectId: input.objectId,
          agentName: output.delegationRequest.agentName,
        },
        depth + 1,
      );
    }
  }

  return { run, proposedActions, delegatedResult };
}
