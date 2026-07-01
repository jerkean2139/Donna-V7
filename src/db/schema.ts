import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const cognitiveObjectTypeEnum = pgEnum("cognitive_object_type", [
  "decision",
  "research",
  "meeting",
  "proposal",
  "issue",
  "lesson",
  "memory",
]);

export const cognitiveObjectStatusEnum = pgEnum("cognitive_object_status", [
  "draft",
  "active",
  "analyzing",
  "approval_required",
  "approved",
  "executed",
  "archived",
]);

export const cognitiveObjectSourceEnum = pgEnum("cognitive_object_source", [
  "manual",
  "chat",
  "upload",
  "email",
  "meeting",
  "api",
  "system",
]);

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high", "critical"]);

export const relationshipTypeEnum = pgEnum("relationship_type", [
  "supports",
  "contradicts",
  "caused_by",
  "resulted_in",
  "references",
  "supersedes",
  "duplicates",
  "depends_on",
]);

export const relationshipSourceEnum = pgEnum("relationship_source", [
  "human",
  "system_rule",
  "ai_inferred",
  "integration_metadata",
  "import_process",
]);

export const cognitiveObjects = pgTable("cognitive_objects", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: varchar("tenant_id", { length: 191 }).notNull(),
  projectId: uuid("project_id"),
  createdByUserId: varchar("created_by_user_id", { length: 191 }).notNull(),
  objectType: cognitiveObjectTypeEnum("object_type").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: text("summary"),
  body: text("body"),
  status: cognitiveObjectStatusEnum("status").notNull().default("draft"),
  source: cognitiveObjectSourceEnum("source").notNull().default("manual"),
  riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
  confidenceScore: integer("confidence_score"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cognitiveObjectRelationships = pgTable("cognitive_object_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: varchar("tenant_id", { length: 191 }).notNull(),
  fromObjectId: uuid("from_object_id").notNull().references(() => cognitiveObjects.id),
  toObjectId: uuid("to_object_id").notNull().references(() => cognitiveObjects.id),
  relationshipType: relationshipTypeEnum("relationship_type").notNull(),
  strength: integer("strength").notNull().default(60),
  source: relationshipSourceEnum("source").notNull(),
  createdByUserId: varchar("created_by_user_id", { length: 191 }),
  createdByAgentId: varchar("created_by_agent_id", { length: 191 }),
  evidenceSummary: text("evidence_summary"),
  confirmedByUserId: varchar("confirmed_by_user_id", { length: 191 }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cognitiveObjectLoopRuns = pgTable("cognitive_object_loop_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: varchar("tenant_id", { length: 191 }).notNull(),
  objectId: uuid("object_id").notNull().references(() => cognitiveObjects.id),
  loopVersion: varchar("loop_version", { length: 50 }).notNull(),
  intentSummary: text("intent_summary"),
  hiddenGoal: text("hidden_goal"),
  contextSummary: text("context_summary"),
  assumptions: jsonb("assumptions").$type<unknown[]>().notNull().default([]),
  optionsConsidered: jsonb("options_considered").$type<unknown[]>().notNull().default([]),
  critique: jsonb("critique").$type<unknown[]>().notNull().default([]),
  risks: jsonb("risks").$type<unknown[]>().notNull().default([]),
  recommendation: text("recommendation"),
  confidenceScore: integer("confidence_score"),
  releaseScore: integer("release_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cognitiveObjectApprovals = pgTable("cognitive_object_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: varchar("tenant_id", { length: 191 }).notNull(),
  objectId: uuid("object_id").notNull().references(() => cognitiveObjects.id),
  approvalStatus: varchar("approval_status", { length: 50 }).notNull().default("requested"),
  approvalReason: text("approval_reason"),
  requestedByUserId: varchar("requested_by_user_id", { length: 191 }),
  approvedByUserId: varchar("approved_by_user_id", { length: 191 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  notes: text("notes"),
});

export const cognitiveObjectOutcomes = pgTable("cognitive_object_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: varchar("tenant_id", { length: 191 }).notNull(),
  objectId: uuid("object_id").notNull().references(() => cognitiveObjects.id),
  outcomeSummary: text("outcome_summary").notNull(),
  successScore: integer("success_score"),
  lessonLearned: text("lesson_learned"),
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
