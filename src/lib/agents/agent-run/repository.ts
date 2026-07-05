import { and, count, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { agentRuns } from "../../../db/schema";
import type * as dbSchema from "../../../db/schema";
import type { AgentRun, CreateAgentRunInput } from "./types";

// All-time run counts per agent for a tenant, for the agent roster's stat
// cards. Only truly-stored, countable facts (agent_runs has no latency
// column, so the roster never shows an invented response time).
export interface AgentRunAggregate {
  agentName: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
}

export interface AgentRunRepository {
  create(input: CreateAgentRunInput): Promise<AgentRun>;
  listByObjectForTenant(objectId: string, tenantId: string): Promise<AgentRun[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<AgentRun | null>;
  // Mission Control activity feed + department strip: recent runs tenant-wide,
  // bounded, newest first. This is the memory-event feed's fallback source
  // until Phase 2.5's memory_events stream lands.
  listRecentForTenant(tenantId: string, limit: number): Promise<AgentRun[]>;
  // Agent roster stat cards: all-time run counts grouped by agent.
  aggregateByAgentForTenant(tenantId: string): Promise<AgentRunAggregate[]>;
}

export class InMemoryAgentRunRepository implements AgentRunRepository {
  private readonly store = new Map<string, AgentRun>();

  async create(input: CreateAgentRunInput): Promise<AgentRun> {
    const run: AgentRun = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      objectId: input.objectId,
      agentName: input.agentName,
      task: input.task,
      status: input.status,
      responseText: input.responseText ?? null,
      toolCalls: input.toolCalls ?? [],
      delegationRequest: input.delegationRequest ?? null,
      createdAt: new Date(),
    };
    this.store.set(run.id, run);
    return run;
  }

  async listByObjectForTenant(objectId: string, tenantId: string): Promise<AgentRun[]> {
    return Array.from(this.store.values())
      .filter((run) => run.tenantId === tenantId && run.objectId === objectId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<AgentRun | null> {
    const run = this.store.get(id);
    return run && run.tenantId === tenantId ? run : null;
  }

  async listRecentForTenant(tenantId: string, limit: number): Promise<AgentRun[]> {
    return Array.from(this.store.values())
      .filter((run) => run.tenantId === tenantId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, Math.max(0, limit));
  }

  async aggregateByAgentForTenant(tenantId: string): Promise<AgentRunAggregate[]> {
    const byAgent = new Map<string, AgentRunAggregate>();
    for (const run of this.store.values()) {
      if (run.tenantId !== tenantId) continue;
      const agg = byAgent.get(run.agentName) ?? {
        agentName: run.agentName,
        totalRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
      };
      agg.totalRuns += 1;
      if (run.status === "completed") agg.completedRuns += 1;
      if (run.status === "failed") agg.failedRuns += 1;
      byAgent.set(run.agentName, agg);
    }
    return Array.from(byAgent.values());
  }
}

type AgentRunRecord = typeof agentRuns.$inferSelect;

export function toAgentRun(record: AgentRunRecord): AgentRun {
  return {
    id: record.id,
    tenantId: record.tenantId,
    objectId: record.objectId,
    agentName: record.agentName,
    task: record.task,
    status: record.status,
    responseText: record.responseText,
    toolCalls: record.toolCalls as AgentRun["toolCalls"],
    delegationRequest: record.delegationRequest as AgentRun["delegationRequest"],
    createdAt: record.createdAt,
  };
}

function toCreateAgentRunValues(input: CreateAgentRunInput): typeof agentRuns.$inferInsert {
  return {
    tenantId: input.tenantId,
    objectId: input.objectId,
    agentName: input.agentName,
    task: input.task,
    status: input.status,
    responseText: input.responseText ?? null,
    toolCalls: input.toolCalls ?? [],
    delegationRequest: (input.delegationRequest as Record<string, unknown> | null) ?? null,
  };
}

export class DrizzleAgentRunRepository implements AgentRunRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async create(input: CreateAgentRunInput): Promise<AgentRun> {
    const [record] = await this.db.insert(agentRuns).values(toCreateAgentRunValues(input)).returning();
    if (!record) {
      throw new Error("Failed to create agent run.");
    }
    return toAgentRun(record);
  }

  async listByObjectForTenant(objectId: string, tenantId: string): Promise<AgentRun[]> {
    const records = await this.db
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.objectId, objectId), eq(agentRuns.tenantId, tenantId)))
      .orderBy(desc(agentRuns.createdAt));
    return records.map(toAgentRun);
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<AgentRun | null> {
    const [record] = await this.db
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.id, id), eq(agentRuns.tenantId, tenantId)))
      .limit(1);
    return record ? toAgentRun(record) : null;
  }

  async listRecentForTenant(tenantId: string, limit: number): Promise<AgentRun[]> {
    const records = await this.db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.tenantId, tenantId))
      .orderBy(desc(agentRuns.createdAt))
      .limit(Math.max(0, limit));
    return records.map(toAgentRun);
  }

  async aggregateByAgentForTenant(tenantId: string): Promise<AgentRunAggregate[]> {
    const rows = await this.db
      .select({
        agentName: agentRuns.agentName,
        totalRuns: count(),
        completedRuns: sql<number>`count(*) filter (where ${agentRuns.status} = 'completed')`,
        failedRuns: sql<number>`count(*) filter (where ${agentRuns.status} = 'failed')`,
      })
      .from(agentRuns)
      .where(eq(agentRuns.tenantId, tenantId))
      .groupBy(agentRuns.agentName);

    // postgres returns bigint counts as strings; normalize to numbers.
    return rows.map((row) => ({
      agentName: row.agentName,
      totalRuns: Number(row.totalRuns),
      completedRuns: Number(row.completedRuns),
      failedRuns: Number(row.failedRuns),
    }));
  }
}
