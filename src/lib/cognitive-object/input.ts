import { z } from "zod";
import { cognitiveObjectSources, cognitiveObjectTypes, riskLevels } from "./types";

export const createCognitiveObjectFormSchema = z.object({
  objectType: z.enum(cognitiveObjectTypes),
  title: z.string().min(3).max(180),
  objective: z.string().max(2000).optional(),
  summary: z.string().max(1000).optional(),
  body: z.string().optional(),
  source: z.enum(cognitiveObjectSources).default("manual"),
  riskLevel: z.enum(riskLevels).default("low"),
  tags: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    ),
});

export type CreateCognitiveObjectFormInput = z.infer<typeof createCognitiveObjectFormSchema>;

export function parseCreateCognitiveObjectFormData(formData: FormData): CreateCognitiveObjectFormInput {
  return createCognitiveObjectFormSchema.parse({
    objectType: formData.get("objectType"),
    title: formData.get("title"),
    objective: formData.get("objective") ?? undefined,
    summary: formData.get("summary") ?? undefined,
    body: formData.get("body") ?? undefined,
    source: formData.get("source") ?? "manual",
    riskLevel: formData.get("riskLevel") ?? "low",
    tags: formData.get("tags") ?? undefined,
  });
}
