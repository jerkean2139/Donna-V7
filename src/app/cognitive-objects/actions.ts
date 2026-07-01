"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { parseCreateCognitiveObjectFormData } from "@/lib/cognitive-object/input";
import { cognitiveObjectRepository } from "@/lib/cognitive-object/repository";
import { createCognitiveObject } from "@/lib/cognitive-object/service";
import { evolutionLoopRunRepository } from "@/lib/evolution-loop/repository";
import { startEvolutionLoopForObject } from "@/lib/evolution-loop/service";

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

const startEvolutionLoopFormSchema = z.object({
  objectId: z.string().min(1),
});

export async function startEvolutionLoopAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = startEvolutionLoopFormSchema.parse({
    objectId: formData.get("objectId"),
  });

  await startEvolutionLoopForObject(cognitiveObjectRepository, evolutionLoopRunRepository, {
    objectId: input.objectId,
    tenantId: tenant.tenantId,
  });

  revalidatePath(`/cognitive-objects/${input.objectId}`);
  redirect(`/cognitive-objects/${input.objectId}`);
}
