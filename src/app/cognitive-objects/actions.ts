"use server";

import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant";
import { parseCreateCognitiveObjectFormData } from "@/lib/cognitive-object/input";
import { cognitiveObjectRepository } from "@/lib/cognitive-object/repository";
import { createCognitiveObject } from "@/lib/cognitive-object/service";

export async function createCognitiveObjectAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = parseCreateCognitiveObjectFormData(formData);

  const result = await createCognitiveObject(cognitiveObjectRepository, {
    tenantId: tenant.tenantId,
    createdByUserId: tenant.userId,
    objectType: input.objectType,
    title: input.title,
    summary: input.summary,
    body: input.body,
    source: input.source,
    riskLevel: input.riskLevel,
    tags: input.tags,
  });

  redirect(`/cognitive-objects/${result.object.id}`);
}
