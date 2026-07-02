import { z } from "zod";
import { riskLevels } from "../cognitive-object/types";

// Decision-specific create form. Unlike the generic Cognitive Object form,
// a decision requires an explicit objective — the thing being decided.
export const createDecisionFormSchema = z.object({
  title: z.string().min(3).max(180),
  objective: z.string().min(3).max(2000),
  summary: z.string().max(1000).optional(),
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

export type CreateDecisionFormInput = z.infer<typeof createDecisionFormSchema>;

export function parseCreateDecisionFormData(formData: FormData): CreateDecisionFormInput {
  return createDecisionFormSchema.parse({
    title: formData.get("title"),
    objective: formData.get("objective"),
    summary: formData.get("summary") ?? undefined,
    riskLevel: formData.get("riskLevel") ?? "low",
    tags: formData.get("tags") ?? undefined,
  });
}
