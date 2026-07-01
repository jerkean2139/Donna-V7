import { z } from "zod";
import { confidenceScoreSchema } from "../cognitive-object/schema";
import { riskLevels } from "../cognitive-object/types";
import { loopReleaseCategoryIds } from "./types";

export const loopAssumptionSchema = z.object({
  text: z.string().min(1),
  riskLevel: z.enum(riskLevels),
  needsVerification: z.boolean(),
});

export const loopOptionSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1),
  tradeoffs: z.array(z.string().min(1)).default([]),
});

export const loopCritiqueSchema = z.object({
  lens: z.string().min(1),
  concern: z.string().min(1),
});

export const loopRiskSchema = z.object({
  riskLevel: z.enum(riskLevels),
  summary: z.string().min(1),
  mitigation: z.string().min(1),
});

export const loopReleaseScoreItemSchema = z.object({
  categoryId: z.enum(loopReleaseCategoryIds),
  label: z.string().min(1),
  score: z.number().int().min(0).max(10),
  maxScore: z.literal(10),
  notes: z.string().min(1),
});

export const evolutionLoopRunSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  objectId: z.string().min(1),
  loopVersion: z.string().min(1),
  intentSummary: z.string().nullable(),
  hiddenGoal: z.string().nullable(),
  contextSummary: z.string().nullable(),
  assumptions: z.array(loopAssumptionSchema).default([]),
  optionsConsidered: z.array(loopOptionSchema).default([]),
  critique: z.array(loopCritiqueSchema).default([]),
  risks: z.array(loopRiskSchema).default([]),
  recommendation: z.string().nullable(),
  confidenceScore: confidenceScoreSchema,
  releaseScore: confidenceScoreSchema,
  releaseScoreBreakdown: z.array(loopReleaseScoreItemSchema).default([]),
  approvalRequired: z.boolean(),
  approvalReason: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export const createEvolutionLoopRunInputSchema = evolutionLoopRunSchema.omit({
  id: true,
  createdAt: true,
}).extend({
  loopVersion: z.string().min(1).optional(),
  intentSummary: z.string().nullable().optional(),
  hiddenGoal: z.string().nullable().optional(),
  contextSummary: z.string().nullable().optional(),
  assumptions: z.array(loopAssumptionSchema).optional(),
  optionsConsidered: z.array(loopOptionSchema).optional(),
  critique: z.array(loopCritiqueSchema).optional(),
  risks: z.array(loopRiskSchema).optional(),
  recommendation: z.string().nullable().optional(),
  releaseScoreBreakdown: z.array(loopReleaseScoreItemSchema).optional(),
  approvalRequired: z.boolean().optional(),
  approvalReason: z.string().nullable().optional(),
});
