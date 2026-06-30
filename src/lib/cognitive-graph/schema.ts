import { z } from "zod";
import { relationshipTypes } from "../cognitive-object/types";
import { relationshipSources } from "./types";

export const graphStrengthSchema = z.number().int().min(0).max(100);

export const cognitiveGraphEdgeSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  fromObjectId: z.string().min(1),
  toObjectId: z.string().min(1),
  relationshipType: z.enum(relationshipTypes),
  strength: graphStrengthSchema,
  source: z.enum(relationshipSources),
  createdByUserId: z.string().nullable().optional(),
  createdByAgentId: z.string().nullable().optional(),
  evidenceSummary: z.string().nullable().optional(),
  confirmedByUserId: z.string().nullable().optional(),
  confirmedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const createCognitiveGraphEdgeInputSchema = cognitiveGraphEdgeSchema.omit({
  id: true,
  createdAt: true,
});

export const graphTraversalRequestSchema = z.object({
  tenantId: z.string().min(1),
  objectId: z.string().min(1),
  maxDepth: z.number().int().min(1).max(3).default(1),
  minStrength: graphStrengthSchema.default(60),
  includeRelationshipTypes: z.array(z.enum(relationshipTypes)).optional(),
  includeInferred: z.boolean().default(true),
});
