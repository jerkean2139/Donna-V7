import { z } from "zod";
import { cognitiveObjectSources, cognitiveObjectTypes, riskLevels } from "./types";

export const MAX_BODY_LENGTH = 20000;
export const MAX_TAG_COUNT = 20;
export const MAX_TAG_LENGTH = 64;

export const createCognitiveObjectFormSchema = z.object({
  objectType: z.enum(cognitiveObjectTypes),
  title: z.string().trim().min(3, "Title needs at least 3 characters.").max(180),
  summary: z.string().max(1000).optional(),
  body: z.string().max(MAX_BODY_LENGTH, `Body must stay under ${MAX_BODY_LENGTH} characters.`).optional(),
  source: z.enum(cognitiveObjectSources).default("manual"),
  riskLevel: z.enum(riskLevels).default("low"),
  tags: z
    .string()
    .max(2000)
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    )
    .refine((tags) => tags.length <= MAX_TAG_COUNT, `Use at most ${MAX_TAG_COUNT} tags.`)
    .refine(
      (tags) => tags.every((tag) => tag.length <= MAX_TAG_LENGTH),
      `Each tag must stay under ${MAX_TAG_LENGTH} characters.`,
    ),
});

export type CreateCognitiveObjectFormInput = z.infer<typeof createCognitiveObjectFormSchema>;
