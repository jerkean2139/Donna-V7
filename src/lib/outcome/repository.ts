import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { cognitiveObjectOutcomes } from "../../db/schema";
import type * as dbSchema from "../../db/schema";
import type { CognitiveObjectOutcome } from "../cognitive-object/types";

export interface CreateOutcomeRepositoryInput {
  tenantId: string;
  objectId: string;
  outcomeSummary: string;
  successScore?: number | null;
  lessonLearned?: string | null;
  followUpRequired?: boolean;
}

export interface OutcomeRepository {
  create(input: CreateOutcomeRepositoryInput): Promise<CognitiveObjectOutcome>;
  listByObjectForTenant(objectId: string, tenantId: string): Promise<CognitiveObjectOutcome[]>;
}

export class InMemoryOutcomeRepository implements OutcomeRepository {
  private readonly store = new Map<string, CognitiveObjectOutcome>();

  async create(input: CreateOutcomeRepositoryInput): Promise<CognitiveObjectOutcome> {
    const outcome: CognitiveObjectOutcome = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      objectId: input.objectId,
      outcomeSummary: input.outcomeSummary,
      successScore: input.successScore ?? null,
      lessonLearned: input.lessonLearned ?? null,
      followUpRequired: input.followUpRequired ?? false,
      createdAt: new Date(),
    };

    this.store.set(outcome.id, outcome);
    return outcome;
  }

  async listByObjectForTenant(objectId: string, tenantId: string): Promise<CognitiveObjectOutcome[]> {
    return Array.from(this.store.values())
      .filter((outcome) => outcome.tenantId === tenantId && outcome.objectId === objectId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

type OutcomeRecord = typeof cognitiveObjectOutcomes.$inferSelect;

export function toOutcome(record: OutcomeRecord): CognitiveObjectOutcome {
  return {
    id: record.id,
    tenantId: record.tenantId,
    objectId: record.objectId,
    outcomeSummary: record.outcomeSummary,
    successScore: record.successScore,
    lessonLearned: record.lessonLearned,
    followUpRequired: record.followUpRequired,
    createdAt: record.createdAt,
  };
}

export function toCreateOutcomeValues(
  input: CreateOutcomeRepositoryInput,
): typeof cognitiveObjectOutcomes.$inferInsert {
  return {
    tenantId: input.tenantId,
    objectId: input.objectId,
    outcomeSummary: input.outcomeSummary,
    successScore: input.successScore ?? null,
    lessonLearned: input.lessonLearned ?? null,
    followUpRequired: input.followUpRequired ?? false,
  };
}

export class DrizzleOutcomeRepository implements OutcomeRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async create(input: CreateOutcomeRepositoryInput): Promise<CognitiveObjectOutcome> {
    const [record] = await this.db
      .insert(cognitiveObjectOutcomes)
      .values(toCreateOutcomeValues(input))
      .returning();

    if (!record) {
      throw new Error("Failed to create outcome.");
    }

    return toOutcome(record);
  }

  async listByObjectForTenant(objectId: string, tenantId: string): Promise<CognitiveObjectOutcome[]> {
    const records = await this.db
      .select()
      .from(cognitiveObjectOutcomes)
      .where(
        and(
          eq(cognitiveObjectOutcomes.objectId, objectId),
          eq(cognitiveObjectOutcomes.tenantId, tenantId),
        ),
      )
      .orderBy(desc(cognitiveObjectOutcomes.createdAt));

    return records.map(toOutcome);
  }
}
