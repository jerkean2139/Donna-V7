import type { CognitiveObject } from "./types";

export interface CreateCognitiveObjectRepositoryInput {
  tenantId: string;
  createdByUserId: string;
  objectType: CognitiveObject["objectType"];
  title: string;
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

export const cognitiveObjectRepository: CognitiveObjectRepository =
  new InMemoryCognitiveObjectRepository();
