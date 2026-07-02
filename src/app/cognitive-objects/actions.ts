"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { createCognitiveObjectFormSchema } from "@/lib/cognitive-object/input";
import { toFieldErrors, type FormActionState } from "@/lib/forms";
import { cognitiveObjectRepository, evolutionLoopRunRepository } from "@/lib/repositories";
import { createCognitiveObject } from "@/lib/cognitive-object/service";
import { startEvolutionLoopForObject } from "@/lib/evolution-loop/service";

export async function createCognitiveObjectAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tenant = await getTenantContext();

  const parsed = createCognitiveObjectFormSchema.safeParse({
    objectType: formData.get("objectType"),
    title: formData.get("title"),
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

  try {
    const result = await createCognitiveObject(cognitiveObjectRepository, {
      tenantId: tenant.tenantId,
      createdByUserId: tenant.userId,
      objectType: parsed.data.objectType,
      title: parsed.data.title,
      summary: parsed.data.summary,
      body: parsed.data.body,
      source: parsed.data.source,
      riskLevel: parsed.data.riskLevel,
      tags: parsed.data.tags,
    });
    objectId = result.object.id;
  } catch {
    return {
      status: "error",
      message: "The Cognitive Object could not be saved. Please try again.",
    };
  }

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

  await startEvolutionLoopForObject(cognitiveObjectRepository, evolutionLoopRunRepository, {
    objectId: input.objectId,
    tenantId: tenant.tenantId,
  });

  revalidatePath(`/cognitive-objects/${input.objectId}`);
  redirect(`/cognitive-objects/${input.objectId}`);
}
