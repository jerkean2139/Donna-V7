import { z } from "zod";
import { riskLevels } from "../cognitive-object/types";
import { loopReleaseCategoryIds } from "../evolution-loop/types";

// Mirrors evolution-loop/schema.ts's option/critique shapes, extended with
// sourceObjectIds for provenance. Kept separate from the persisted-run schema
// because this is what we validate the MODEL's output against, before it is
// ever written to a CreateEvolutionLoopRunInput.
export const sourcedAssumptionSchema = z.object({
  text: z.string().min(1).max(500),
  riskLevel: z.enum(riskLevels),
  needsVerification: z.boolean(),
  sourceObjectIds: z.array(z.string()).default([]),
});

export const sourcedRiskSchema = z.object({
  riskLevel: z.enum(riskLevels),
  summary: z.string().min(1).max(500),
  mitigation: z.string().min(1).max(500),
  sourceObjectIds: z.array(z.string()).default([]),
});

export const reasoningOptionSchema = z.object({
  name: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  tradeoffs: z.array(z.string().min(1).max(300)).min(1).max(6),
});

export const reasoningCritiqueSchema = z.object({
  lens: z.string().min(1).max(80),
  concern: z.string().min(1).max(500),
});

export const reasoningOutputSchema = z.object({
  intentSummary: z.string().min(12).max(500),
  contextSummary: z.string().min(12).max(1000),
  assumptions: z.array(sourcedAssumptionSchema).min(1).max(8),
  optionsConsidered: z.array(reasoningOptionSchema).min(2).max(5),
  critique: z.array(reasoningCritiqueSchema).min(1).max(6),
  risks: z.array(sourcedRiskSchema).min(1).max(8),
  recommendation: z.string().min(12).max(1000),
  suggestedConfidence: z.number().int().min(0).max(100),
  confidenceRationale: z.string().min(12).max(500),
});

export const judgeCategoryScoreSchema = z.object({
  categoryId: z.enum(loopReleaseCategoryIds),
  score: z.number().int().min(0).max(10),
  rationale: z.string().min(1).max(300),
});

export const judgeOutputSchema = z.object({
  categoryScores: z.array(judgeCategoryScoreSchema).length(loopReleaseCategoryIds.length),
  overallNotes: z.string().min(1).max(1000),
});
