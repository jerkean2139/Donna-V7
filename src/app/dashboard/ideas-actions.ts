"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { DomainError } from "@/lib/errors";
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
import { checkRateLimit } from "@/lib/security/rate-limit";

// Ideas Lab is a low-friction front door to the create -> reason -> govern
// flow that already exists (Phase 3 design, Decision 5). It is not new engine
// work: it derives a title, creates a Cognitive Object (embedded like any
// other), and -- when the user asks -- fires the same Evolution Loop the
// object detail page does. The governance gate is unchanged.
const captureIdeaSchema = z.object({
  idea: z.string().min(3, "Jot down a little more detail.").max(5000),
  analyze: z.enum(["true", "false"]).optional(),
});

// Same tighter cap as the loop action: capturing WITH analysis triggers a
// real AI call, so it shares that budget per tenant.
const IDEAS_LAB_RATE_LIMIT = { windowMs: 60_000, maxRequests: 20 };

function deriveTitle(idea: string): string {
  const firstLine = idea.trim().split("\n")[0]?.trim() ?? "";
  const title = firstLine.length > 0 ? firstLine : idea.trim();
  return title.length > 120 ? `${title.slice(0, 117)}…` : title;
}

export async function captureIdeaAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tenant = await getTenantContext();

  const parsed = captureIdeaSchema.safeParse({
    idea: formData.get("idea"),
    analyze: formData.get("analyze") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted field and try again.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  checkRateLimit(`ideas_lab:${tenant.tenantId}`, IDEAS_LAB_RATE_LIMIT);

  const analyze = parsed.data.analyze === "true";
  let objectId: string;
  const startedAt = Date.now();

  try {
    const result = await createCognitiveObject(
      cognitiveObjectRepository,
      {
        tenantId: tenant.tenantId,
        createdByUserId: tenant.userId,
        objectType: "issue",
        title: deriveTitle(parsed.data.idea),
        body: parsed.data.idea,
        source: "manual",
        riskLevel: "low",
        tags: ["ideas-lab"],
      },
      embeddingProvider,
    );
    objectId = result.object.id;

    if (analyze) {
      await startEvolutionLoopForObject(
        cognitiveObjectRepository,
        evolutionLoopRunRepository,
        reasoningEngine,
        contextRetriever,
        { objectId, tenantId: tenant.tenantId },
      );
    }
  } catch (error) {
    logger.error("ideas_lab.capture_failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      analyze,
      error: errorField(error),
      durationMs: Date.now() - startedAt,
    });
    return {
      status: "error",
      message:
        error instanceof DomainError ? error.message : "The idea could not be captured. Please try again.",
    };
  }

  logger.info("ideas_lab.captured", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    objectId,
    analyzed: analyze,
    durationMs: Date.now() - startedAt,
  });

  revalidatePath("/dashboard");
  redirect(`/cognitive-objects/${objectId}`);
}
