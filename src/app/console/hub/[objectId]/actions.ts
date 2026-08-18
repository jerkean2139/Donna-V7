"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { DomainError } from "@/lib/errors";
import { errorField, logger } from "@/lib/logger";
import {
  agentRunRepository,
  cognitiveGraphRepository,
  cognitiveObjectRepository,
  proposedActionRepository,
} from "@/lib/repositories";
import {
  approveAndExecuteProposedAction,
  rejectProposedAction,
} from "@/lib/agents/proposed-action/service";

const decideSchema = z.object({
  proposedActionId: z.uuid("Invalid proposed action id."),
  objectId: z.uuid("Invalid object id."),
});

// Hub-local approve/reject: same governed service as the object detail page,
// but redirects back to the Work Hub so the user stays in the workspace.
export async function approveFromHubAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = decideSchema.parse({
    proposedActionId: formData.get("proposedActionId"),
    objectId: formData.get("objectId"),
  });

  try {
    const action = await approveAndExecuteProposedAction(
      proposedActionRepository,
      agentRunRepository,
      { id: input.proposedActionId, tenantId: tenant.tenantId, userId: tenant.userId },
      { objectRepository: cognitiveObjectRepository, graphRepository: cognitiveGraphRepository },
    );
    logger.info("console.hub.action_approved", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      proposedActionId: action.id,
      status: action.status,
    });
  } catch (error) {
    logger.error("console.hub.action_approve_failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      proposedActionId: input.proposedActionId,
      domainError: error instanceof DomainError,
      error: errorField(error),
    });
    throw error;
  }

  revalidatePath(`/console/hub/${input.objectId}`);
  redirect(`/console/hub/${input.objectId}`);
}

export async function rejectFromHubAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = decideSchema.parse({
    proposedActionId: formData.get("proposedActionId"),
    objectId: formData.get("objectId"),
  });

  await rejectProposedAction(proposedActionRepository, {
    id: input.proposedActionId,
    tenantId: tenant.tenantId,
    userId: tenant.userId,
  });

  logger.info("console.hub.action_rejected", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    proposedActionId: input.proposedActionId,
  });

  revalidatePath(`/console/hub/${input.objectId}`);
  redirect(`/console/hub/${input.objectId}`);
}
