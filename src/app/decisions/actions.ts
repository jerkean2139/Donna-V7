"use server";

import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import { cognitiveObjectRepository } from "@/lib/repositories";
import { createCognitiveObject } from "@/lib/cognitive-object/service";
import { parseCreateDecisionFormData } from "@/lib/decision/input";
import { DECISION_OBJECT_TYPE } from "@/lib/decision/service";

export async function createDecisionAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = parseCreateDecisionFormData(formData);

  const result = await createCognitiveObject(cognitiveObjectRepository, {
    tenantId: tenant.tenantId,
    createdByUserId: tenant.userId,
    objectType: DECISION_OBJECT_TYPE,
    title: input.title,
    objective: input.objective,
    summary: input.summary,
    source: "manual",
    riskLevel: input.riskLevel,
    tags: input.tags,
  });

  redirect(`/decisions/${result.object.id}`);
}
