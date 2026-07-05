import { createHash } from "node:crypto";
import { DomainError } from "../errors";
import { EMBEDDING_DIMENSIONS } from "../../db/schema";

export interface EmbeddingConfig {
  apiKey: string | undefined;
  model: string;
}

// Model is env-driven, never hardcoded (same discipline as ai/config.ts).
// Anthropic doesn't offer an embeddings endpoint; Voyage AI is Anthropic's
// recommended embedding partner.
export function loadEmbeddingConfig(): EmbeddingConfig {
  return {
    apiKey: process.env.VOYAGE_API_KEY,
    model: process.env.EMBEDDING_MODEL ?? "voyage-3-lite",
  };
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

// Real provider. output size is whatever the configured model natively
// produces (voyage-3-lite: 512) -- it must match EMBEDDING_DIMENSIONS, the
// fixed width of the pgvector column, or every insert fails. Changing
// EMBEDDING_MODEL to a model with a different native size requires a new
// migration, not just an env change; embed() fails loud rather than writing
// a mismatched vector.
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async embed(text: string): Promise<number[]> {
    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [text],
        model: this.model,
        input_type: "document",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Voyage embeddings API error: HTTP ${response.status} -- ${body.slice(0, 200)}`);
    }

    const result = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
    const embedding = result.data?.[0]?.embedding;
    if (!embedding) {
      throw new Error("Voyage embeddings API returned no embedding.");
    }
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new DomainError(
        `EMBEDDING_MODEL "${this.model}" returned a ${embedding.length}-dimension vector, but the database column is fixed at ${EMBEDDING_DIMENSIONS}. Use a model with matching output size, or run a new migration.`,
      );
    }
    return embedding;
  }
}

// Deterministic, keyless fake: feature-hashed trigrams (the "hashing trick"
// for bag-of-n-grams) into a unit vector, so text sharing substrings lands
// closer together in cosine space than unrelated text -- the one property
// semantic-neighbor tests actually depend on -- without a live key or the
// O(text length * dimensions) cost of hashing every dimension per gram.
export class FakeEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    return hashTextToUnitVector(text, EMBEDDING_DIMENSIONS);
  }
}

function hashTextToUnitVector(text: string, dimensions: number): number[] {
  const normalized = text.toLowerCase().trim();
  const vector = new Array<number>(dimensions).fill(0);
  if (!normalized) return vector;

  const gramLength = Math.min(3, normalized.length);
  for (let i = 0; i <= normalized.length - gramLength; i += 1) {
    const gram = normalized.slice(i, i + gramLength);
    const digest = createHash("sha256").update(gram).digest();
    const index = digest.readUInt32BE(0) % dimensions;
    const sign = digest[4]! % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}
