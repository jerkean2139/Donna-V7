"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { errorField, logger } from "@/lib/logger";
import {
  agentEngine,
  agentRunRepository,
  cognitiveGraphRepository,
  cognitiveObjectRepository,
  credentialRepository,
  proposedActionRepository,
} from "@/lib/repositories";
import {
  approveAndExecuteProposedAction,
  rejectProposedAction,
} from "@/lib/agents/proposed-action/service";
import { startAgentTask } from "@/lib/agents/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

// Same rate-limit discipline as the Evolution Loop action: an agent run is a
// real AI call (once ANTHROPIC_API_KEY is set) that can also cascade into a
// delegated second run, so it gets the tighter cap.
const AGENT_TASK_RATE_LIMIT = { windowMs: 60_000, maxRequests: 15 };

const startAgentTaskFormSchema = z.object({
  objectId: z.uuid("Invalid Cognitive Object id."),
  agentName: z.string().min(1).max(120),
  task: z.string().min(3).max(2000),
});

export async function startAgentTaskAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = startAgentTaskFormSchema.parse({
    objectId: formData.get("objectId"),
    agentName: formData.get("agentName"),
    task: formData.get("task"),
  });

  checkRateLimit(`agent_task:${tenant.tenantId}`, AGENT_TASK_RATE_LIMIT);

  const startedAt = Date.now();
  const result = await startAgentTask(
    {
      objectRepository: cognitiveObjectRepository,
      graphRepository: cognitiveGraphRepository,
      credentialRepository,
      agentRunRepository,
      proposedActionRepository,
      agentEngine,
    },
    {
      task: input.task,
      tenantId: tenant.tenantId,
      objectId: input.objectId,
      agentName: input.agentName,
    },
  );

  logger.info("agent_task.started", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    objectId: input.objectId,
    agentName: input.agentName,
    runId: result.run.id,
    proposedActionCount: result.proposedActions.length,
    delegated: Boolean(result.delegatedResult),
    durationMs: Date.now() - startedAt,
  });

  revalidatePath(`/cognitive-objects/${input.objectId}`);
  redirect(`/cognitive-objects/${input.objectId}`);
}

const decideProposedActionFormSchema = z.object({
  proposedActionId: z.uuid("Invalid proposed action id."),
  objectId: z.uuid("Invalid Cognitive Object id."),
});

export async function approveProposedActionAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = decideProposedActionFormSchema.parse({
    proposedActionId: formData.get("proposedActionId"),
    objectId: formData.get("objectId"),
  });

  try {
    const action = await approveAndExecuteProposedAction(
      proposedActionRepository,
      agentRunRepository,
      { id: input.proposedActionId, tenantId: tenant.tenantId, userId: tenant.userId },
      {
        objectRepository: cognitiveObjectRepository,
        graphRepository: cognitiveGraphRepository,
        credentialRepository,
      },
    );
    logger.info("proposed_action.approved", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      proposedActionId: action.id,
      status: action.status,
    });
  } catch (error) {
    logger.error("proposed_action.approve_failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      proposedActionId: input.proposedActionId,
      error: errorField(error),
    });
    throw error;
  }

  revalidatePath(`/cognitive-objects/${input.objectId}`);
  redirect(`/cognitive-objects/${input.objectId}`);
}

export async function rejectProposedActionAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = decideProposedActionFormSchema.parse({
    proposedActionId: formData.get("proposedActionId"),
    objectId: formData.get("objectId"),
  });

  await rejectProposedAction(proposedActionRepository, {
    id: input.proposedActionId,
    tenantId: tenant.tenantId,
    userId: tenant.userId,
  });

  logger.info("proposed_action.rejected", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    proposedActionId: input.proposedActionId,
  });

  revalidatePath(`/cognitive-objects/${input.objectId}`);
  redirect(`/cognitive-objects/${input.objectId}`);
}
