"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/auth/tenant";
import { toFieldErrors, type FormActionState } from "@/lib/forms";
import { errorField, logger } from "@/lib/logger";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { createCognitiveObject } from "@/lib/cognitive-object/service";
import { createDecisionFormSchema } from "@/lib/decision/input";
import { DECISION_OBJECT_TYPE } from "@/lib/decision/service";

export async function createDecisionAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tenant = await getTenantContext();

  const parsed = createDecisionFormSchema.safeParse({
    title: formData.get("title"),
    objective: formData.get("objective"),
    summary: formData.get("summary") || undefined,
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

  let decisionId: string;
  const startedAt = Date.now();

  try {
    const result = await createCognitiveObject(cognitiveObjectRepository, {
      tenantId: tenant.tenantId,
      createdByUserId: tenant.userId,
      objectType: DECISION_OBJECT_TYPE,
      title: parsed.data.title,
      objective: parsed.data.objective,
      summary: parsed.data.summary,
      source: "manual",
      riskLevel: parsed.data.riskLevel,
      tags: parsed.data.tags,
    });
    decisionId = result.object.id;
  } catch (error) {
    logger.error("decision.create.failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      error: errorField(error),
      durationMs: Date.now() - startedAt,
    });
    return {
      status: "error",
      message: "The decision could not be saved. Please try again.",
    };
  }

  logger.info("decision.created", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    objectId: decisionId,
    riskLevel: parsed.data.riskLevel,
    durationMs: Date.now() - startedAt,
  });

  revalidatePath("/decisions");
  redirect(`/decisions/${decisionId}`);
}
