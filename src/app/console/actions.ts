"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import { conversationRepository } from "@/lib/console/repository";
import { planDonnaTurn } from "@/lib/console/orchestrator";

const MAX_MESSAGE = 4000;

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

  logger.info("console.turn", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    routedAgent: plan.routedAgent,
  });

  revalidatePath("/console");
  redirect("/console");
}
