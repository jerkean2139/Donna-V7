export const cognitiveObjectTypes = [
  "decision",
  "research",
  "meeting",
  "proposal",
  "issue",
  "lesson",
  "memory",
] as const;

export type CognitiveObjectType = (typeof cognitiveObjectTypes)[number];

export const cognitiveObjectStatuses = [
  "draft",
  "active",
  "analyzing",
  "approval_required",
  "approved",
  "executed",
  "archived",
] as const;

export type CognitiveObjectStatus = (typeof cognitiveObjectStatuses)[number];

export const cognitiveObjectSources = [
  "manual",
  "chat",
  "upload",
  "email",
  "meeting",
  "api",
  "system",
] as const;

export type CognitiveObjectSource = (typeof cognitiveObjectSources)[number];

export const riskLevels = ["low", "medium", "high", "critical"] as const;

export type RiskLevel = (typeof riskLevels)[number];

export const relationshipTypes = [
  "supports",
  "contradicts",
  "caused_by",
  "resulted_in",
  "references",
  "supersedes",
  "duplicates",
  "depends_on",
] as const;

export type RelationshipType = (typeof relationshipTypes)[number];

export interface CognitiveObject {
  id: string;
  tenantId: string;
  projectId?: string | null;
  createdByUserId: string;
  objectType: CognitiveObjectType;
  title: string;
  objective?: string | null;
  summary?: string | null;
  body?: string | null;
  status: CognitiveObjectStatus;
  source: CognitiveObjectSource;
  riskLevel: RiskLevel;
  confidenceScore?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CognitiveObjectRelationship {
  id: string;
  tenantId: string;
  fromObjectId: string;
  toObjectId: string;
  relationshipType: RelationshipType;
  strength: number;
  createdBy: "user" | "agent" | "system";
  createdAt: Date;
}

export interface CognitiveObjectLoopRun {
  id: string;
  tenantId: string;
  objectId: string;
  loopVersion: string;
  intentSummary?: string | null;
  hiddenGoal?: string | null;
  contextSummary?: string | null;
  assumptions?: unknown[];
  optionsConsidered?: unknown[];
  critique?: unknown[];
  risks?: unknown[];
  recommendation?: string | null;
  confidenceScore?: number | null;
  releaseScore?: number | null;
  createdAt: Date;
}

export interface CognitiveObjectApproval {
  id: string;
  tenantId: string;
  objectId: string;
  approvalStatus: "not_required" | "requested" | "approved" | "rejected";
  approvalReason?: string | null;
  requestedByUserId?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  notes?: string | null;
}

export interface CognitiveObjectOutcome {
  id: string;
  tenantId: string;
  objectId: string;
  outcomeSummary: string;
  successScore?: number | null;
  lessonLearned?: string | null;
  followUpRequired: boolean;
  createdAt: Date;
}
