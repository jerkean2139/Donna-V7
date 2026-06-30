import { z } from "zod";
import {
  cognitiveObjectSources,
  cognitiveObjectStatuses,
  cognitiveObjectTypes,
  relationshipTypes,
  riskLevels,
} from "./types";

export const confidenceScoreSchema = z
  .number()
  .int()
  .min(0)
  .max(100)
  .nullable()
  .optional();

export const cognitiveObjectSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  projectId: z.string().min(1).nullable().optional(),
  createdByUserId: z.string().min(1),
  objectType: z.enum(cognitiveObjectTypes),
  title: z.string().min(3).max(180),
  summary: z.string().max(1000).nullable().optional(),
  body: z.string().nullable().optional(),
  status: z.enum(cognitiveObjectStatuses),
  source: z.enum(cognitiveObjectSources),
  riskLevel: z.enum(riskLevels),
  confidenceScore: confidenceScoreSchema,
  tags: z.array(z.string().min(1).max(64)).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCognitiveObjectInputSchema = cognitiveObjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const cognitiveObjectRelationshipSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  fromObjectId: z.string().min(1),
  toObjectId: z.string().min(1),
  relationshipType: z.enum(relationshipTypes),
  strength: z.number().int().min(0).max(100),
  createdBy: z.enum(["user", "agent", "system"]),
  createdAt: z.coerce.date(),
});

export const cognitiveObjectLoopRunSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  objectId: z.string().min(1),
  loopVersion: z.string().min(1),
  intentSummary: z.string().nullable().optional(),
  hiddenGoal: z.string().nullable().optional(),
  contextSummary: z.string().nullable().optional(),
  assumptions: z.array(z.unknown()).default([]),
  optionsConsidered: z.array(z.unknown()).default([]),
  critique: z.array(z.unknown()).default([]),
  risks: z.array(z.unknown()).default([]),
  recommendation: z.string().nullable().optional(),
  confidenceScore: confidenceScoreSchema,
  releaseScore: confidenceScoreSchema,
  createdAt: z.coerce.date(),
});

export const cognitiveObjectApprovalSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  objectId: z.string().min(1),
  approvalStatus: z.enum(["not_required", "requested", "approved", "rejected"]),
  approvalReason: z.string().nullable().optional(),
  requestedByUserId: z.string().nullable().optional(),
  approvedByUserId: z.string().nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  rejectedAt: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const cognitiveObjectOutcomeSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  objectId: z.string().min(1),
  outcomeSummary: z.string().min(3),
  successScore: confidenceScoreSchema,
  lessonLearned: z.string().nullable().optional(),
  followUpRequired: z.boolean(),
  createdAt: z.coerce.date(),
});
