"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import { errorField, logger } from "@/lib/logger";
import { conversationRepository } from "@/lib/console/repository";
import { planDonnaTurn } from "@/lib/console/orchestrator";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import { createCognitiveObject } from "@/lib/cognitive-object/service";
import { startAgentTask } from "@/lib/agents/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  agentEngine,
  agentRunRepository,
  cognitiveGraphRepository,
  cognitiveObjectRepository,
  proposedActionRepository,
} from "@/lib/repositories";
import type { CognitiveObjectType } from "@/lib/cognitive-object/types";

const MAX_MESSAGE = 4000;
// An agent run is a real AI call (once ANTHROPIC_API_KEY is set) that can
// cascade into a delegated run, so cap it per tenant like the other AI routes.
const AGENT_RUN_RATE_LIMIT = { windowMs: 60_000, maxRequests: 15 };

// How Donna captures a routed request as a Cognitive Object (the agent's
// "work hub"): Deep Research produces research; everything else is a tracked
// task/issue until the agent reshapes it.
const AGENT_CAPTURE_TYPE: Record<string, CognitiveObjectType> = {
  "Deep Research": "research",
};

function titleFrom(message: string): string {
  const firstLine = message.split("\n")[0]!.trim();
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine;
}

export async function sendConsoleMessageAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const message = String(formData.get("message") ?? "").trim().slice(0, MAX_MESSAGE);

  if (!message) {
    redirect("/console");
  }

  const conversation = await conversationRepository.getOrCreateActive(tenant.tenantId);

  await conversationRepository.appendMessage({
    conversationId: conversation.id,
    tenantId: tenant.tenantId,
    role: "user",
    content: message,
  });

  // Donna plans her turn: answer directly or call in a specialist agent.
  const plan = planDonnaTurn(message);

  await conversationRepository.appendMessage({
    conversationId: conversation.id,
    tenantId: tenant.tenantId,
    role: "donna",
    content: plan.reply,
    agentName: plan.routedAgent,
  });

  // When Donna routes to a specialist, actually run them: capture the request
  // as a Cognitive Object (their work hub) and execute the agent against it.
  // Read tools inform reasoning; act tools become ProposedActions the user
  // must approve — the governance rule is unchanged.
  if (plan.routedAgent && AGENT_REGISTRY[plan.routedAgent]) {
    const startedAt = Date.now();
    try {
      checkRateLimit(`console_agent:${tenant.tenantId}`, AGENT_RUN_RATE_LIMIT);

      const captureType = AGENT_CAPTURE_TYPE[plan.routedAgent] ?? "issue";
      const { object } = await createCognitiveObject(cognitiveObjectRepository, {
        tenantId: tenant.tenantId,
        createdByUserId: tenant.userId,
        objectType: captureType,
        title: titleFrom(message),
        objective: message,
        source: "chat",
        riskLevel: "low",
        tags: ["console", plan.routedAgent],
      });

      const result = await startAgentTask(
        {
          objectRepository: cognitiveObjectRepository,
          graphRepository: cognitiveGraphRepository,
          agentRunRepository,
          proposedActionRepository,
          agentEngine,
        },
        {
          task: message,
          tenantId: tenant.tenantId,
          objectId: object.id,
          agentName: plan.routedAgent,
        },
      );

      const proposedCount = result.proposedActions.length;
      const approvalNote =
        proposedCount > 0
          ? `\n\nI've proposed ${proposedCount} action${proposedCount === 1 ? "" : "s"} that need${proposedCount === 1 ? "s" : ""} your approval — open the work hub to review.`
          : "";

      await conversationRepository.appendMessage({
        conversationId: conversation.id,
        tenantId: tenant.tenantId,
        role: "agent",
        agentName: plan.routedAgent,
        content: (result.run.responseText ?? "Done.") + approvalNote,
        objectId: object.id,
        proposedActionCount: proposedCount,
      });

      logger.info("console.agent_run", {
        tenantId: tenant.tenantId,
        userId: tenant.userId,
        agentName: plan.routedAgent,
        objectId: object.id,
        proposedActionCount: proposedCount,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      logger.error("console.agent_run.failed", {
        tenantId: tenant.tenantId,
        userId: tenant.userId,
        agentName: plan.routedAgent,
        error: errorField(error),
        durationMs: Date.now() - startedAt,
      });
      await conversationRepository.appendMessage({
        conversationId: conversation.id,
        tenantId: tenant.tenantId,
        role: "donna",
        content: `I couldn't finish handing that to ${plan.routedAgent} just now. Try again in a moment.`,
      });
    }
  }

  revalidatePath("/console");
  redirect("/console");
}
