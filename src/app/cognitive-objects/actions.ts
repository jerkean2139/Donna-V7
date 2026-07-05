"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { createCognitiveObjectFormSchema } from "@/lib/cognitive-object/input";
import { toFieldErrors, type FormActionState } from "@/lib/forms";
import { errorField, logger } from "@/lib/logger";
import {
  cognitiveObjectRepository,
  contextRetriever,
  embeddingProvider,
  evolutionLoopRunRepository,
  reasoningEngine,
} from "@/lib/repositories";
import { createCognitiveObject } from "@/lib/cognitive-object/service";
import { startEvolutionLoopForObject } from "@/lib/evolution-loop/service";
import { assertAiRunQuota } from "@/lib/billing/enforce";
import { checkRateLimit } from "@/lib/security/rate-limit";

const EVOLUTION_LOOP_RATE_LIMIT = { windowMs: 60_000, maxRequests: 20 };

export async function createCognitiveObjectAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tenant = await getTenantContext();

  const parsed = createCognitiveObjectFormSchema.safeParse({
    objectType: formData.get("objectType"),
    title: formData.get("title"),
    objective: formData.get("objective") || undefined,
    summary: formData.get("summary") || undefined,
    body: formData.get("body") || undefined,
    source: formData.get("source") ?? "manual",
    riskLevel: formData.get("riskLevel") ?? "low",
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  let objectId: string;
  const startedAt = Date.now();

  try {
    const result = await createCognitiveObject(
      cognitiveObjectRepository,
      {
        tenantId: tenant.tenantId,
        createdByUserId: tenant.userId,
        objectType: parsed.data.objectType,
        title: parsed.data.title,
        objective: parsed.data.objective,
        summary: parsed.data.summary,
        body: parsed.data.body,
        source: parsed.data.source,
        riskLevel: parsed.data.riskLevel,
        tags: parsed.data.tags,
      },
      embeddingProvider,
    );
    objectId = result.object.id;
  } catch (error) {
    logger.error("cognitive_object.create.failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      error: errorField(error),
      durationMs: Date.now() - startedAt,
    });
    return {
      status: "error",
      message: "The Cognitive Object could not be saved. Please try again.",
    };
  }

  logger.info("cognitive_object.created", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    objectId,
    objectType: parsed.data.objectType,
    riskLevel: parsed.data.riskLevel,
    durationMs: Date.now() - startedAt,
  });

  revalidatePath("/cognitive-objects");
  redirect(`/cognitive-objects/${objectId}`);
}

const startEvolutionLoopFormSchema = z.object({
  objectId: z.uuid("Invalid Cognitive Object id."),
});

export async function startEvolutionLoopAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = startEvolutionLoopFormSchema.parse({
    objectId: formData.get("objectId"),
  });

  // Each loop run is a real AI call once ANTHROPIC_API_KEY is set (cost +
  // latency), so this is the first route to rate-limit per Phase 1 design's
  // security section. Per-tenant so one tenant's usage can't exhaust another's.
  checkRateLimit(`evolution_loop:${tenant.tenantId}`, EVOLUTION_LOOP_RATE_LIMIT);
  // Plan gate (cost) sits beside the rate limit and governance (risk).
  await assertAiRunQuota(tenant.tenantId);

  const startedAt = Date.now();
  const run = await startEvolutionLoopForObject(
    cognitiveObjectRepository,
    evolutionLoopRunRepository,
    reasoningEngine,
    contextRetriever,
    {
      objectId: input.objectId,
      tenantId: tenant.tenantId,
    },
  );

  logger.info("evolution_loop.started", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    objectId: input.objectId,
    runId: run.id,
    approvalRequired: run.approvalRequired,
    durationMs: Date.now() - startedAt,
  });

  revalidatePath(`/cognitive-objects/${input.objectId}`);
  redirect(`/cognitive-objects/${input.objectId}`);
}
