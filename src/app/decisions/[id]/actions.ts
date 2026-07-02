"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { DomainError } from "@/lib/errors";
import { toFieldErrors, type FormActionState } from "@/lib/forms";
import { errorField, logger } from "@/lib/logger";
import { cognitiveObjectRepository, outcomeRepository } from "@/lib/repositories";
import { recordDecisionOutcome } from "@/lib/decision/service";

const recordOutcomeFormSchema = z.object({
  objectId: z.uuid("Invalid decision id."),
  outcomeSummary: z
    .string()
    .min(3, "Describe what happened in at least 3 characters.")
    .max(2000),
  successScore: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : null))
    .refine((value) => value === null || (Number.isInteger(value) && value >= 0 && value <= 100), {
      message: "Success score must be between 0 and 100.",
    }),
  lessonLearned: z.string().max(2000).optional(),
  followUpRequired: z.string().optional(),
});

export async function recordDecisionOutcomeAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tenant = await getTenantContext();

  const parsed = recordOutcomeFormSchema.safeParse({
    objectId: formData.get("objectId"),
    outcomeSummary: formData.get("outcomeSummary"),
    successScore: formData.get("successScore") || undefined,
    lessonLearned: formData.get("lessonLearned") || undefined,
    followUpRequired: formData.get("followUpRequired") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const startedAt = Date.now();

  try {
    const outcome = await recordDecisionOutcome(cognitiveObjectRepository, outcomeRepository, {
      tenantId: tenant.tenantId,
      objectId: parsed.data.objectId,
      outcomeSummary: parsed.data.outcomeSummary,
      successScore: parsed.data.successScore,
      lessonLearned: parsed.data.lessonLearned ?? null,
      followUpRequired: parsed.data.followUpRequired === "on",
    });

    logger.info("decision.outcome.recorded", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      objectId: parsed.data.objectId,
      outcomeId: outcome.id,
      followUpRequired: outcome.followUpRequired,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error("decision.outcome.record_failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      objectId: parsed.data.objectId,
      domainError: error instanceof DomainError,
      error: errorField(error),
      durationMs: Date.now() - startedAt,
    });
    return {
      status: "error",
      message:
        error instanceof DomainError
          ? error.message
          : "The outcome could not be saved. Please try again.",
    };
  }

  revalidatePath(`/decisions/${parsed.data.objectId}`);
  return { status: "idle" };
}
