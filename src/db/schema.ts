import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

// Fixed by the pgvector column below -- every embedding written or queried
// must be exactly this length. Matches voyage-3-lite's native output size
// (see src/lib/ai/embeddings.ts); changing EMBEDDING_MODEL to a model with a
// different output size requires a new migration, not just an env change.
export const EMBEDDING_DIMENSIONS = 512;

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

export const cognitiveObjects = pgTable(
  "cognitive_objects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    projectId: uuid("project_id"),
    createdByUserId: varchar("created_by_user_id", { length: 191 }).notNull(),
    objectType: cognitiveObjectTypeEnum("object_type").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    objective: text("objective"),
    summary: text("summary"),
    body: text("body"),
    status: cognitiveObjectStatusEnum("status").notNull().default("draft"),
    source: cognitiveObjectSourceEnum("source").notNull().default("manual"),
    riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
    confidenceScore: integer("confidence_score"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    // Embed-on-create only (Cognitive Objects have no update path today);
    // null until the embedding provider call completes. Never selected into
    // the public CognitiveObject type -- see toCognitiveObject in
    // cognitive-object/repository.ts -- so a raw vector never reaches a page
    // or an API response.
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Composite index serves both tenant-only filters and the default
    // "newest first" tenant listing.
    index("cognitive_objects_tenant_created_idx").on(table.tenantId, table.createdAt),
    check(
      "cognitive_objects_confidence_score_range",
      sql`${table.confidenceScore} IS NULL OR (${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 100)`,
    ),
    index("cognitive_objects_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const cognitiveObjectRelationships = pgTable(
  "cognitive_object_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    fromObjectId: uuid("from_object_id")
      .notNull()
      .references(() => cognitiveObjects.id, { onDelete: "cascade" }),
    toObjectId: uuid("to_object_id")
      .notNull()
      .references(() => cognitiveObjects.id, { onDelete: "cascade" }),
    relationshipType: relationshipTypeEnum("relationship_type").notNull(),
    strength: integer("strength").notNull().default(60),
    source: relationshipSourceEnum("source").notNull(),
    createdByUserId: varchar("created_by_user_id", { length: 191 }),
    createdByAgentId: varchar("created_by_agent_id", { length: 191 }),
    evidenceSummary: text("evidence_summary"),
    confirmedByUserId: varchar("confirmed_by_user_id", { length: 191 }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cognitive_object_relationships_tenant_from_idx").on(table.tenantId, table.fromObjectId),
    index("cognitive_object_relationships_tenant_to_idx").on(table.tenantId, table.toObjectId),
    // The same pair of objects can only carry one edge of a given type.
    uniqueIndex("cognitive_object_relationships_unique_edge_idx").on(
      table.tenantId,
      table.fromObjectId,
      table.toObjectId,
      table.relationshipType,
    ),
    check(
      "cognitive_object_relationships_strength_range",
      sql`${table.strength} >= 0 AND ${table.strength} <= 100`,
    ),
    check(
      "cognitive_object_relationships_no_self_edge",
      sql`${table.fromObjectId} <> ${table.toObjectId}`,
    ),
  ],
);

export const cognitiveObjectLoopRuns = pgTable(
  "cognitive_object_loop_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    objectId: uuid("object_id")
      .notNull()
      .references(() => cognitiveObjects.id, { onDelete: "cascade" }),
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
    releaseScoreBreakdown: jsonb("release_score_breakdown").$type<unknown[]>().notNull().default([]),
    approvalRequired: boolean("approval_required").notNull().default(false),
    approvalReason: text("approval_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cognitive_object_loop_runs_tenant_object_idx").on(table.tenantId, table.objectId),
    check(
      "cognitive_object_loop_runs_confidence_score_range",
      sql`${table.confidenceScore} IS NULL OR (${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 100)`,
    ),
    check(
      "cognitive_object_loop_runs_release_score_range",
      sql`${table.releaseScore} IS NULL OR (${table.releaseScore} >= 0 AND ${table.releaseScore} <= 100)`,
    ),
  ],
);

export const cognitiveObjectApprovals = pgTable(
  "cognitive_object_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    // Approvals are audit trail: block object deletion while they exist.
    objectId: uuid("object_id")
      .notNull()
      .references(() => cognitiveObjects.id, { onDelete: "restrict" }),
    approvalStatus: varchar("approval_status", { length: 50 }).notNull().default("requested"),
    approvalReason: text("approval_reason"),
    requestedByUserId: varchar("requested_by_user_id", { length: 191 }),
    approvedByUserId: varchar("approved_by_user_id", { length: 191 }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cognitive_object_approvals_tenant_object_idx").on(table.tenantId, table.objectId),
  ],
);

export const cognitiveObjectOutcomes = pgTable(
  "cognitive_object_outcomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    // Outcomes are audit trail: block object deletion while they exist.
    objectId: uuid("object_id")
      .notNull()
      .references(() => cognitiveObjects.id, { onDelete: "restrict" }),
    outcomeSummary: text("outcome_summary").notNull(),
    successScore: integer("success_score"),
    lessonLearned: text("lesson_learned"),
    followUpRequired: boolean("follow_up_required").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cognitive_object_outcomes_tenant_object_idx").on(table.tenantId, table.objectId),
    check(
      "cognitive_object_outcomes_success_score_range",
      sql`${table.successScore} IS NULL OR (${table.successScore} >= 0 AND ${table.successScore} <= 100)`,
    ),
  ],
);

// ── Phase 2: Agent runs + governed Proposed Actions ──

export const agentRunStatusEnum = pgEnum("agent_run_status", ["completed", "failed"]);

export const proposedActionStatusEnum = pgEnum("proposed_action_status", [
  "proposed",
  "approved",
  "rejected",
  "executed",
  "failed",
]);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    // Agent runs (and the proposed actions they produce) are audit trail:
    // block object deletion while they exist, same convention as approvals
    // and outcomes above.
    objectId: uuid("object_id")
      .notNull()
      .references(() => cognitiveObjects.id, { onDelete: "restrict" }),
    agentName: varchar("agent_name", { length: 120 }).notNull(),
    task: text("task").notNull(),
    status: agentRunStatusEnum("status").notNull(),
    responseText: text("response_text"),
    toolCalls: jsonb("tool_calls").$type<unknown[]>().notNull().default([]),
    delegationRequest: jsonb("delegation_request").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("agent_runs_tenant_object_idx").on(table.tenantId, table.objectId)],
);

export const proposedActions = pgTable(
  "proposed_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "restrict" }),
    // Denormalized from the run for direct "pending actions on this object"
    // queries without a join.
    objectId: uuid("object_id")
      .notNull()
      .references(() => cognitiveObjects.id, { onDelete: "restrict" }),
    toolName: varchar("tool_name", { length: 120 }).notNull(),
    args: jsonb("args").$type<Record<string, unknown>>().notNull().default({}),
    description: text("description").notNull(),
    effectiveRiskLevel: riskLevelEnum("effective_risk_level").notNull(),
    reversible: boolean("reversible").notNull(),
    status: proposedActionStatusEnum("status").notNull().default("proposed"),
    approvalRequired: boolean("approval_required").notNull(),
    approvalReason: text("approval_reason"),
    decidedByUserId: varchar("decided_by_user_id", { length: 191 }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    resultSummary: text("result_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("proposed_actions_tenant_object_idx").on(table.tenantId, table.objectId),
    index("proposed_actions_tenant_run_idx").on(table.tenantId, table.agentRunId),
    index("proposed_actions_tenant_status_idx").on(table.tenantId, table.status),
  ],
);

// ── Phase 2 PR3: per-tenant integration credentials ──

export const integrationProviderEnum = pgEnum("integration_provider", ["ghl", "resend"]);

export const tenantIntegrationCredentials = pgTable(
  "tenant_integration_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    provider: integrationProviderEnum("provider").notNull(),
    // AES-256-GCM ciphertext (base64 of iv || authTag || ciphertext), never
    // plaintext -- see src/lib/security/encryption.ts. The application layer
    // decrypts on read; nothing here is queryable or indexable as plaintext.
    encryptedValue: text("encrypted_value").notNull(),
    createdByUserId: varchar("created_by_user_id", { length: 191 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One credential per tenant per provider; setting a new one replaces it.
    uniqueIndex("tenant_integration_credentials_tenant_provider_idx").on(table.tenantId, table.provider),
  ],
);

// ── Phase 3: embeddable feedback widget keys ──

export const feedbackWidgetKeys = pgTable(
  "feedback_widget_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: varchar("tenant_id", { length: 191 }).notNull(),
    // Public-by-design: this ships inside a <script> tag on the tenant's site,
    // so it is NOT a secret. It only authorizes "create a low-trust feedback
    // object for this tenant" and nothing else. Distinct from the encrypted
    // integration credentials above, which are secret.
    publicKey: varchar("public_key", { length: 64 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    // Origin allowlist (defense-in-depth on top of the key). Empty = allow any
    // origin; the key alone gates. Enforced by the ingest route's CORS check.
    allowedOrigins: jsonb("allowed_origins").$type<string[]>().notNull().default([]),
    createdByUserId: varchar("created_by_user_id", { length: 191 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Revocation is a soft delete: a revoked key stops resolving but stays for
    // the audit trail.
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("feedback_widget_keys_public_key_idx").on(table.publicKey),
    index("feedback_widget_keys_tenant_idx").on(table.tenantId),
  ],
);
