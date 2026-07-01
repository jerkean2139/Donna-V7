import { EVOLUTION_LOOP_VERSION } from "./types";
import type { CreateEvolutionLoopRunInput, EvolutionLoopRun } from "./types";

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

export const evolutionLoopRunRepository: EvolutionLoopRunRepository =
  new InMemoryEvolutionLoopRunRepository();
