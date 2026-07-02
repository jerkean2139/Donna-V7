"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { relationshipTypes } from "@/lib/cognitive-object/types";
import { DomainError } from "@/lib/errors";
import { toFieldErrors, type FormActionState } from "@/lib/forms";
import { errorField, logger } from "@/lib/logger";
import { cognitiveGraphRepository, cognitiveObjectRepository } from "@/lib/repositories";
import { createCognitiveGraphEdge } from "@/lib/cognitive-graph/service";

const createRelationshipFormSchema = z.object({
  fromObjectId: z.uuid("Invalid source Cognitive Object."),
  toObjectId: z.uuid("Choose a Cognitive Object to relate to."),
  relationshipType: z.enum(relationshipTypes, "Choose a valid relationship type."),
  strength: z.coerce
    .number("Strength must be a number.")
    .int("Strength must be a whole number.")
    .min(0, "Strength must be between 0 and 100.")
    .max(100, "Strength must be between 0 and 100."),
  evidenceSummary: z
    .string()
    .max(2000, "Evidence summary must stay under 2000 characters.")
    .optional(),
});

export async function createRelationshipAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tenant = await getTenantContext();

  const parsed = createRelationshipFormSchema.safeParse({
    fromObjectId: formData.get("fromObjectId"),
    toObjectId: formData.get("toObjectId"),
    relationshipType: formData.get("relationshipType"),
    strength: formData.get("strength") || 60,
    evidenceSummary: formData.get("evidenceSummary") || undefined,
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
    const result = await createCognitiveGraphEdge(cognitiveGraphRepository, cognitiveObjectRepository, {
      tenantId: tenant.tenantId,
      fromObjectId: parsed.data.fromObjectId,
      toObjectId: parsed.data.toObjectId,
      relationshipType: parsed.data.relationshipType,
      strength: parsed.data.strength,
      source: "human",
      createdByUserId: tenant.userId,
      evidenceSummary: parsed.data.evidenceSummary?.trim() || null,
    });

    logger.info("cognitive_graph.edge.created", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      edgeId: result.edge.id,
      relationshipType: parsed.data.relationshipType,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error("cognitive_graph.edge.create_failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      fromObjectId: parsed.data.fromObjectId,
      toObjectId: parsed.data.toObjectId,
      domainError: error instanceof DomainError,
      error: errorField(error),
      durationMs: Date.now() - startedAt,
    });
    return {
      status: "error",
      message:
        error instanceof DomainError
          ? error.message
          : "The relationship could not be created. Please try again.",
    };
  }

  revalidatePath(`/cognitive-objects/${parsed.data.fromObjectId}`);
  redirect(`/cognitive-objects/${parsed.data.fromObjectId}`);
}
