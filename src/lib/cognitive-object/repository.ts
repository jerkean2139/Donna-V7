import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { cognitiveObjects } from "../../db/schema";
import type * as dbSchema from "../../db/schema";
import type { CognitiveObject } from "./types";

export interface CreateCognitiveObjectRepositoryInput {
  tenantId: string;
  createdByUserId: string;
  objectType: CognitiveObject["objectType"];
  title: string;
  objective?: string | null;
  summary?: string | null;
  body?: string | null;
  source: CognitiveObject["source"];
  riskLevel: CognitiveObject["riskLevel"];
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface CognitiveObjectRepository {
  create(input: CreateCognitiveObjectRepositoryInput): Promise<CognitiveObject>;
  listByTenant(tenantId: string): Promise<CognitiveObject[]>;
  findByIdForTenant(id: string, tenantId: string): Promise<CognitiveObject | null>;
}

export class InMemoryCognitiveObjectRepository implements CognitiveObjectRepository {
  private readonly store = new Map<string, CognitiveObject>();

  async create(input: CreateCognitiveObjectRepositoryInput): Promise<CognitiveObject> {
    const now = new Date();
    const object: CognitiveObject = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      projectId: null,
      createdByUserId: input.createdByUserId,
      objectType: input.objectType,
      title: input.title,
      objective: input.objective ?? null,
      summary: input.summary ?? null,
      body: input.body ?? null,
      status: "draft",
      source: input.source,
      riskLevel: input.riskLevel,
      confidenceScore: null,
      tags: input.tags,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.store.set(object.id, object);
    return object;
  }

  async listByTenant(tenantId: string): Promise<CognitiveObject[]> {
    return Array.from(this.store.values()).filter((object) => object.tenantId === tenantId);
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<CognitiveObject | null> {
    const object = this.store.get(id);

    if (!object || object.tenantId !== tenantId) {
      return null;
    }

    return object;
  }
}

type CognitiveObjectRecord = typeof cognitiveObjects.$inferSelect;

export function toCognitiveObject(record: CognitiveObjectRecord): CognitiveObject {
  return {
    id: record.id,
    tenantId: record.tenantId,
    projectId: record.projectId,
    createdByUserId: record.createdByUserId,
    objectType: record.objectType,
    title: record.title,
    objective: record.objective,
    summary: record.summary,
    body: record.body,
    status: record.status,
    source: record.source,
    riskLevel: record.riskLevel,
    confidenceScore: record.confidenceScore,
    tags: record.tags,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toCreateCognitiveObjectValues(
  input: CreateCognitiveObjectRepositoryInput,
): typeof cognitiveObjects.$inferInsert {
  return {
    tenantId: input.tenantId,
    createdByUserId: input.createdByUserId,
    objectType: input.objectType,
    title: input.title,
    objective: input.objective ?? null,
    summary: input.summary ?? null,
    body: input.body ?? null,
    source: input.source,
    riskLevel: input.riskLevel,
    tags: input.tags,
    metadata: input.metadata ?? {},
  };
}

export class DrizzleCognitiveObjectRepository implements CognitiveObjectRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof dbSchema>) {}

  async create(input: CreateCognitiveObjectRepositoryInput): Promise<CognitiveObject> {
    const [record] = await this.db
      .insert(cognitiveObjects)
      .values(toCreateCognitiveObjectValues(input))
      .returning();

    if (!record) {
      throw new Error("Failed to create cognitive object.");
    }

    return toCognitiveObject(record);
  }

  async listByTenant(tenantId: string): Promise<CognitiveObject[]> {
    const records = await this.db
      .select()
      .from(cognitiveObjects)
      .where(eq(cognitiveObjects.tenantId, tenantId))
      .orderBy(desc(cognitiveObjects.createdAt));

    return records.map(toCognitiveObject);
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<CognitiveObject | null> {
    const [record] = await this.db
      .select()
      .from(cognitiveObjects)
      .where(and(eq(cognitiveObjects.id, id), eq(cognitiveObjects.tenantId, tenantId)))
      .limit(1);

    return record ? toCognitiveObject(record) : null;
  }
}
