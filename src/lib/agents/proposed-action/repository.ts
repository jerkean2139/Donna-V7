import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { proposedActions } from "../../../db/schema";
import type * as dbSchema from "../../../db/schema";
import type { CreateProposedActionInput, ProposedAction, ProposedActionStatus } from "./types";

export interface UpdateProposedActionStatusInput {
  id: string;
  tenantId: string;
  status: ProposedActionStatus;
  decidedByUserId?: string | null;
  resultSummary?: string | null;
}

export interface ProposedActionRepository {
  create(input: CreateProposedActionInput): Promise<ProposedAction>;
  findByIdForTenant(id: string, tenantId: string): Promise<ProposedAction | null>;
  listByObjectForTenant(objectId: string, tenantId: string): Promise<ProposedAction[]>;
  // Mission Control: the "Needs You" queue -- every action still in "proposed"
  // that governance flagged for human approval, tenant-wide, newest first.
  // Unbounded window is intentional: an old pending approval must never fall
  // off the queue just because newer runs happened.
  listPendingApprovalForTenant(tenantId: string): Promise<ProposedAction[]>;
  // Mission Control metrics + feed: the most recent actions of any status,
  // bounded, newest first.
  listRecentForTenant(tenantId: string, limit: number): Promise<ProposedAction[]>;
  updateStatus(input: UpdateProposedActionStatusInput): Promise<ProposedAction>;
}

export class InMemoryProposedActionRepository implements ProposedActionRepository {
  private readonly store = new Map<string, ProposedAction>();

  async create(input: CreateProposedActionInput): Promise<ProposedAction> {
    const action: ProposedAction = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      agentRunId: input.agentRunId,
      objectId: input.objectId,
      toolName: input.toolName,
      args: input.args,
      description: input.description,
      effectiveRiskLevel: input.effectiveRiskLevel,
      reversible: input.reversible,
      status: input.status ?? "proposed",
      approvalRequired: input.approvalRequired,
      approvalReason: input.approvalReason,
      decidedByUserId: null,
      decidedAt: null,
      resultSummary: null,
      createdAt: new Date(),
    };
    this.store.set(action.id, action);
    return action;
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<ProposedAction | null> {
    const action = this.store.get(id);
    return action && action.tenantId === tenantId ? action : null;
  }

  async listByObjectForTenant(objectId: string, tenantId: string): Promise<ProposedAction[]> {
    return Array.from(this.store.values())
      .filter((action) => action.tenantId === tenantId && action.objectId === objectId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async listPendingApprovalForTenant(tenantId: string): Promise<ProposedAction[]> {
    return Array.from(this.store.values())
      .filter(
        (action) =>
          action.tenantId === tenantId && action.status === "proposed" && action.approvalRequired,
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async listRecentForTenant(tenantId: string, limit: number): Promise<ProposedAction[]> {
    return Array.from(this.store.values())
      .filter((action) => action.tenantId === tenantId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, Math.max(0, limit));
  }

  async updateStatus(input: UpdateProposedActionStatusInput): Promise<ProposedAction> {
    const existing = this.store.get(input.id);
    if (!existing || existing.tenantId !== input.tenantId) {
      throw new Error("Proposed action not found for active tenant.");
    }
    const updated: ProposedAction = {
      ...existing,
      status: input.status,
      decidedByUserId: input.decidedByUserId ?? existing.decidedByUserId,
      decidedAt: new Date(),
      resultSummary: input.resultSummary ?? existing.resultSummary,
    };
    this.store.set(updated.id, updated);
    return updated;
  }
}

type ProposedActionRecord = typeof proposedActions.$inferSelect;

export function toProposedAction(record: ProposedActionRecord): ProposedAction {
  return {
    id: record.id,
    tenantId: record.tenantId,
    agentRunId: record.agentRunId,
    objectId: record.objectId,
    toolName: record.toolName,
    args: record.args,
    description: record.description,
    effectiveRiskLevel: record.effectiveRiskLevel,
    reversible: record.reversible,
    status: record.status,
    approvalRequired: record.approvalRequired,
    approvalReason: record.approvalReason,
    decidedByUserId: record.decidedByUserId,
    decidedAt: record.decidedAt,
    resultSummary: record.resultSummary,
    createdAt: record.createdAt,
  };
}

function toCreateProposedActionValues(
  input: CreateProposedActionInput,
): typeof proposedActions.$inferInsert {
  return {
    tenantId: input.tenantId,
    agentRunId: input.agentRunId,
    objectId: input.objectId,
    toolName: input.toolName,
    args: input.args,
    description: input.description,
    effectiveRiskLevel: input.effectiveRiskLevel,
    reversible: input.reversible,
    status: input.status ?? "proposed",
    approvalRequired: input.approvalRequired,
    approvalReason: input.approvalReason,
  };
}

export class DrizzleProposedActionRepository implements ProposedActionRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async create(input: CreateProposedActionInput): Promise<ProposedAction> {
    const [record] = await this.db
      .insert(proposedActions)
      .values(toCreateProposedActionValues(input))
      .returning();
    if (!record) {
      throw new Error("Failed to create proposed action.");
    }
    return toProposedAction(record);
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<ProposedAction | null> {
    const [record] = await this.db
      .select()
      .from(proposedActions)
      .where(and(eq(proposedActions.id, id), eq(proposedActions.tenantId, tenantId)))
      .limit(1);
    return record ? toProposedAction(record) : null;
  }

  async listByObjectForTenant(objectId: string, tenantId: string): Promise<ProposedAction[]> {
    const records = await this.db
      .select()
      .from(proposedActions)
      .where(and(eq(proposedActions.objectId, objectId), eq(proposedActions.tenantId, tenantId)))
      .orderBy(desc(proposedActions.createdAt));
    return records.map(toProposedAction);
  }

  async listPendingApprovalForTenant(tenantId: string): Promise<ProposedAction[]> {
    const records = await this.db
      .select()
      .from(proposedActions)
      .where(
        and(
          eq(proposedActions.tenantId, tenantId),
          eq(proposedActions.status, "proposed"),
          eq(proposedActions.approvalRequired, true),
        ),
      )
      .orderBy(desc(proposedActions.createdAt));
    return records.map(toProposedAction);
  }

  async listRecentForTenant(tenantId: string, limit: number): Promise<ProposedAction[]> {
    const records = await this.db
      .select()
      .from(proposedActions)
      .where(eq(proposedActions.tenantId, tenantId))
      .orderBy(desc(proposedActions.createdAt))
      .limit(Math.max(0, limit));
    return records.map(toProposedAction);
  }

  async updateStatus(input: UpdateProposedActionStatusInput): Promise<ProposedAction> {
    const [record] = await this.db
      .update(proposedActions)
      .set({
        status: input.status,
        decidedByUserId: input.decidedByUserId,
        decidedAt: new Date(),
        resultSummary: input.resultSummary,
      })
      .where(and(eq(proposedActions.id, input.id), eq(proposedActions.tenantId, input.tenantId)))
      .returning();
    if (!record) {
      throw new Error("Proposed action not found for active tenant.");
    }
    return toProposedAction(record);
  }
}
