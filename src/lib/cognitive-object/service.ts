import type { EmbeddingProvider } from "../ai/embeddings";
import { errorField, logger } from "../logger";
import { evaluateCognitiveObjectGovernance, defaultTenantGovernancePolicy } from "./governance";
import type { CognitiveObject } from "./types";
import type {
  CognitiveObjectRepository,
  CreateCognitiveObjectRepositoryInput,
  ListByTenantOptions,
} from "./repository";

export type CreateCognitiveObjectServiceInput = Omit<CreateCognitiveObjectRepositoryInput, "embedding">;

export interface CognitiveObjectWithGovernance {
  object: CognitiveObject;
  approvalRequired: boolean;
  governanceReasons: string[];
}

// Embedding text caps at a fraction of the body's own 20k-char limit --
// enough for the embedding model to capture the object's meaning without
// paying for (or hashing, in the fake provider) the full body on every call.
const MAX_EMBEDDING_TEXT_LENGTH = 8000;

function buildEmbeddingText(input: CreateCognitiveObjectServiceInput): string {
  const text = [input.title, input.objective, input.summary, input.body].filter(Boolean).join("\n\n");
  return text.slice(0, MAX_EMBEDDING_TEXT_LENGTH);
}

// Embed-on-create only -- Cognitive Objects have no update path today. A
// failed/slow embedding call degrades semantic retrieval, not object
// creation: it's logged and the object is created with a null embedding
// rather than blocking the user or throwing.
export async function createCognitiveObject(
  repository: CognitiveObjectRepository,
  input: CreateCognitiveObjectServiceInput,
  embeddingProvider: EmbeddingProvider,
): Promise<CognitiveObjectWithGovernance> {
  let embedding: number[] | null = null;
  try {
    embedding = await embeddingProvider.embed(buildEmbeddingText(input));
  } catch (error) {
    logger.error("cognitive_object.embed_failed", {
      tenantId: input.tenantId,
      error: errorField(error),
    });
  }

  const object = await repository.create({ ...input, embedding });
  const governance = evaluateCognitiveObjectGovernance(object, defaultTenantGovernancePolicy);

  return {
    object,
    approvalRequired: governance.approvalRequired,
    governanceReasons: governance.reasons,
  };
}

export async function listTenantCognitiveObjects(
  repository: CognitiveObjectRepository,
  tenantId: string,
  options?: ListByTenantOptions,
): Promise<CognitiveObject[]> {
  return repository.listByTenant(tenantId, options);
}

export async function getTenantCognitiveObject(
  repository: CognitiveObjectRepository,
  id: string,
  tenantId: string,
): Promise<CognitiveObject | null> {
  return repository.findByIdForTenant(id, tenantId);
}
