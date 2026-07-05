import { FakeEmbeddingProvider } from "../src/lib/ai/embeddings";
import { EMBEDDING_DIMENSIONS } from "../src/db/schema";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

describe("FakeEmbeddingProvider", () => {
  const provider = new FakeEmbeddingProvider();

  it("produces a vector of exactly EMBEDDING_DIMENSIONS length", async () => {
    const embedding = await provider.embed("Migrate the billing system to Stripe.");
    expect(embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("is deterministic: the same text always embeds to the same vector", async () => {
    const first = await provider.embed("Renew the annual GHL contract.");
    const second = await provider.embed("Renew the annual GHL contract.");
    expect(first).toEqual(second);
  });

  it("embeds an empty string to the zero vector without throwing", async () => {
    const embedding = await provider.embed("");
    expect(embedding.every((value) => value === 0)).toBe(true);
  });

  it("places near-duplicate text closer than unrelated text (cosine similarity)", async () => {
    const base = await provider.embed("Approve the Q3 marketing budget for GHL campaigns.");
    const nearDuplicate = await provider.embed("Approve the Q3 marketing budget for GHL campaign spend.");
    const unrelated = await provider.embed("Rotate the on-call rotation schedule for the SRE team.");

    const similarityToNearDuplicate = cosineSimilarity(base, nearDuplicate);
    const similarityToUnrelated = cosineSimilarity(base, unrelated);

    expect(similarityToNearDuplicate).toBeGreaterThan(similarityToUnrelated);
  });

  it("returns a unit vector (magnitude 1) for non-empty text", async () => {
    const embedding = await provider.embed("Some object title and summary text.");
    const magnitude = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });
});
