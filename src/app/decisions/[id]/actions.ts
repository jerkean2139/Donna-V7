"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { cognitiveObjectRepository, outcomeRepository } from "@/lib/repositories";
import { recordDecisionOutcome } from "@/lib/decision/service";

const recordOutcomeFormSchema = z.object({
  objectId: z.string().min(1),
  outcomeSummary: z.string().min(3).max(2000),
  successScore: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : null))
    .refine((value) => value === null || (value >= 0 && value <= 100), {
      message: "Success score must be between 0 and 100.",
    }),
  lessonLearned: z.string().max(2000).optional(),
  followUpRequired: z.string().optional(),
});

export async function recordDecisionOutcomeAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = recordOutcomeFormSchema.parse({
    objectId: formData.get("objectId"),
    outcomeSummary: formData.get("outcomeSummary"),
    successScore: formData.get("successScore") ?? undefined,
    lessonLearned: formData.get("lessonLearned") ?? undefined,
    followUpRequired: formData.get("followUpRequired") ?? undefined,
  });

  await recordDecisionOutcome(cognitiveObjectRepository, outcomeRepository, {
    tenantId: tenant.tenantId,
    objectId: input.objectId,
    outcomeSummary: input.outcomeSummary,
    successScore: input.successScore,
    lessonLearned: input.lessonLearned ?? null,
    followUpRequired: input.followUpRequired === "on",
  });

  revalidatePath(`/decisions/${input.objectId}`);
}
