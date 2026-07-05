import { InMemoryFeedbackWidgetKeyRepository } from "../src/lib/feedback/repository";
import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { FakeEmbeddingProvider } from "../src/lib/ai/embeddings";
import {
  generateWidgetPublicKey,
  ingestFeedback,
  isOriginAllowed,
  listWidgetKeys,
  mintWidgetKey,
  resolveActiveWidgetKey,
  revokeWidgetKey,
} from "../src/lib/feedback/service";

describe("generateWidgetPublicKey", () => {
  it("produces a prefixed, unique, non-secret-looking key", () => {
    const a = generateWidgetPublicKey();
    const b = generateWidgetPublicKey();
    expect(a).toMatch(/^fw_pub_[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
  });
});

describe("widget key lifecycle", () => {
  it("mints, lists, resolves, and revokes keys tenant-scoped", async () => {
    const repo = new InMemoryFeedbackWidgetKeyRepository();
    const key = await mintWidgetKey(repo, {
      tenantId: "tenant_a",
      userId: "user_1",
      label: "Marketing site",
      allowedOrigins: ["https://example.com"],
    });

    expect(await listWidgetKeys(repo, "tenant_a")).toHaveLength(1);
    expect(await resolveActiveWidgetKey(repo, key.publicKey)).not.toBeNull();

    await revokeWidgetKey(repo, key.id, "tenant_a");
    expect(await resolveActiveWidgetKey(repo, key.publicKey)).toBeNull();
    // Revoked key stays for the audit trail.
    expect(await listWidgetKeys(repo, "tenant_a")).toHaveLength(1);
  });

  it("does not resolve or list another tenant's keys", async () => {
    const repo = new InMemoryFeedbackWidgetKeyRepository();
    await mintWidgetKey(repo, { tenantId: "tenant_a", userId: "u", label: "A", allowedOrigins: [] });
    expect(await listWidgetKeys(repo, "tenant_b")).toEqual([]);
  });

  it("cannot be revoked across tenant boundaries", async () => {
    const repo = new InMemoryFeedbackWidgetKeyRepository();
    const key = await mintWidgetKey(repo, { tenantId: "tenant_a", userId: "u", label: "A", allowedOrigins: [] });
    await revokeWidgetKey(repo, key.id, "tenant_b");
    expect(await resolveActiveWidgetKey(repo, key.publicKey)).not.toBeNull();
  });
});

describe("isOriginAllowed", () => {
  it("allows any origin when the allowlist is empty (key alone gates)", () => {
    expect(isOriginAllowed([], "https://anything.com")).toBe(true);
    expect(isOriginAllowed([], null)).toBe(true);
  });

  it("enforces a configured allowlist exactly", () => {
    expect(isOriginAllowed(["https://a.com"], "https://a.com")).toBe(true);
    expect(isOriginAllowed(["https://a.com"], "https://b.com")).toBe(false);
    expect(isOriginAllowed(["https://a.com"], null)).toBe(false);
  });
});

describe("ingestFeedback", () => {
  it("creates a low-trust, api-sourced Cognitive Object tagged feedback", async () => {
    const objectRepo = new InMemoryCognitiveObjectRepository();
    const { objectId } = await ingestFeedback(objectRepo, new FakeEmbeddingProvider(), {
      tenantId: "tenant_a",
      widgetKeyId: "key_1",
      message: "The pricing page is confusing\nspecifically the annual toggle",
      email: "user@example.com",
      pageUrl: "https://example.com/pricing",
    });

    const object = await objectRepo.findByIdForTenant(objectId, "tenant_a");
    expect(object).not.toBeNull();
    expect(object?.objectType).toBe("issue");
    expect(object?.source).toBe("api");
    expect(object?.riskLevel).toBe("low");
    expect(object?.tags).toContain("feedback");
    expect(object?.title).toBe("The pricing page is confusing");
    expect(object?.createdByUserId).toBe("widget:key_1");
  });
});
