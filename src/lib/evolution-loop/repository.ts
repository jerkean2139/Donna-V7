import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { cognitiveObjectLoopRuns } from "../../db/schema";
import type * as dbSchema from "../../db/schema";
import { EVOLUTION_LOOP_VERSION } from "./types";
import type {
  CreateEvolutionLoopRunInput,
  EvolutionLoopRun,
  LoopAssumption,
  LoopCritique,
  LoopOption,
  LoopReleaseScoreItem,
  LoopRisk,
} from "./types";

export interface EvolutionLoopRunRepository {
  create(input: CreateEvolutionLoopRunInput): Promise<EvolutionLoopRun>;
  listByObjectForTenant(objectId: string, tenantId: string): Promise<EvolutionLoopRun[]>;
}

export class InMemoryEvolutionLoopRunRepository implements EvolutionLoopRunRepository {
  private readonly store = new Map<string, EvolutionLoopRun>();

  async create(input: CreateEvolutionLoopRunInput): Promise<EvolutionLoopRun> {
    const run: EvolutionLoopRun = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      objectId: input.objectId,
      loopVersion: input.loopVersion ?? EVOLUTION_LOOP_VERSION,
      intentSummary: input.intentSummary ?? null,
      hiddenGoal: input.hiddenGoal ?? null,
      contextSummary: input.contextSummary ?? null,
      assumptions: input.assumptions ?? [],
      optionsConsidered: input.optionsConsidered ?? [],
      critique: input.critique ?? [],
      risks: input.risks ?? [],
      recommendation: input.recommendation ?? null,
      confidenceScore: input.confidenceScore ?? null,
      releaseScore: input.releaseScore ?? null,
      releaseScoreBreakdown: input.releaseScoreBreakdown ?? [],
      approvalRequired: input.approvalRequired ?? false,
      approvalReason: input.approvalReason ?? null,
      createdAt: new Date(),
    };

    this.store.set(run.id, run);
    return run;
  }

  async listByObjectForTenant(objectId: string, tenantId: string): Promise<EvolutionLoopRun[]> {
    return Array.from(this.store.values())
      .filter((run) => run.tenantId === tenantId && run.objectId === objectId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

type CognitiveObjectLoopRunRecord = typeof cognitiveObjectLoopRuns.$inferSelect;

export function toEvolutionLoopRun(record: CognitiveObjectLoopRunRecord): EvolutionLoopRun {
  return {
    id: record.id,
    tenantId: record.tenantId,
    objectId: record.objectId,
    loopVersion: record.loopVersion,
    intentSummary: record.intentSummary,
    hiddenGoal: record.hiddenGoal,
    contextSummary: record.contextSummary,
    assumptions: record.assumptions as LoopAssumption[],
    optionsConsidered: record.optionsConsidered as LoopOption[],
    critique: record.critique as LoopCritique[],
    risks: record.risks as LoopRisk[],
    recommendation: record.recommendation,
    confidenceScore: record.confidenceScore,
    releaseScore: record.releaseScore,
    releaseScoreBreakdown: record.releaseScoreBreakdown as LoopReleaseScoreItem[],
    approvalRequired: record.approvalRequired,
    approvalReason: record.approvalReason,
    createdAt: record.createdAt,
  };
}

export function toCreateLoopRunValues(input: CreateEvolutionLoopRunInput): typeof cognitiveObjectLoopRuns.$inferInsert {
  return {
    tenantId: input.tenantId,
    objectId: input.objectId,
    loopVersion: input.loopVersion ?? EVOLUTION_LOOP_VERSION,
    intentSummary: input.intentSummary ?? null,
    hiddenGoal: input.hiddenGoal ?? null,
    contextSummary: input.contextSummary ?? null,
    assumptions: input.assumptions ?? [],
    optionsConsidered: input.optionsConsidered ?? [],
    critique: input.critique ?? [],
    risks: input.risks ?? [],
    recommendation: input.recommendation ?? null,
    confidenceScore: input.confidenceScore ?? null,
    releaseScore: input.releaseScore ?? null,
    releaseScoreBreakdown: input.releaseScoreBreakdown ?? [],
    approvalRequired: input.approvalRequired ?? false,
    approvalReason: input.approvalReason ?? null,
  };
}

export class DrizzleEvolutionLoopRunRepository implements EvolutionLoopRunRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async create(input: CreateEvolutionLoopRunInput): Promise<EvolutionLoopRun> {
    const [record] = await this.db
      .insert(cognitiveObjectLoopRuns)
      .values(toCreateLoopRunValues(input))
      .returning();

    if (!record) {
      throw new Error("Failed to create Evolution Loop run.");
    }

    return toEvolutionLoopRun(record);
  }

  async listByObjectForTenant(objectId: string, tenantId: string): Promise<EvolutionLoopRun[]> {
    const records = await this.db
      .select()
      .from(cognitiveObjectLoopRuns)
      .where(
        and(
          eq(cognitiveObjectLoopRuns.objectId, objectId),
          eq(cognitiveObjectLoopRuns.tenantId, tenantId),
        ),
      )
      .orderBy(desc(cognitiveObjectLoopRuns.createdAt));

    return records.map(toEvolutionLoopRun);
  }
}

export const evolutionLoopRunRepository: EvolutionLoopRunRepository =
  new InMemoryEvolutionLoopRunRepository();
