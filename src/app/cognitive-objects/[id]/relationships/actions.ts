"use server";

import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import { relationshipTypes } from "@/lib/cognitive-object/types";
import { cognitiveGraphRepository } from "@/lib/cognitive-graph/repository";
import { createCognitiveGraphEdge } from "@/lib/cognitive-graph/service";

export async function createRelationshipAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const fromObjectId = String(formData.get("fromObjectId") ?? "");
  const toObjectId = String(formData.get("toObjectId") ?? "");
  const relationshipType = String(formData.get("relationshipType") ?? "");
  const strength = Number(formData.get("strength") ?? 60);
  const evidenceSummary = String(formData.get("evidenceSummary") ?? "");

  if (!fromObjectId || !toObjectId) {
    throw new Error("Both Cognitive Objects are required.");
  }

  if (!relationshipTypes.includes(relationshipType as never)) {
    throw new Error("Invalid relationship type.");
  }

  if (!Number.isInteger(strength) || strength < 0 || strength > 100) {
    throw new Error("Relationship strength must be between 0 and 100.");
  }

  await createCognitiveGraphEdge(cognitiveGraphRepository, {
    tenantId: tenant.tenantId,
    fromObjectId,
    toObjectId,
    relationshipType: relationshipType as never,
    strength,
    source: "human",
    createdByUserId: tenant.userId,
    evidenceSummary: evidenceSummary || null,
  });

  redirect(`/cognitive-objects/${fromObjectId}`);
}
