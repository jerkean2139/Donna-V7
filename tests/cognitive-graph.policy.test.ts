import {
  canUseRelationshipForRecommendation,
  isHighTrustRelationship,
  shouldRequireHumanConfirmation,
  assertSameTenantRelationship,
} from "../src/lib/cognitive-graph/policy";

describe("cognitive graph policy", () => {
  it("treats human-created relationships as high trust", () => {
    expect(
      isHighTrustRelationship({
        strength: 50,
        source: "human",
        confirmedAt: null,
      }),
    ).toBe(true);
  });

  it("blocks weak AI-inferred relationships from recommendations", () => {
    expect(
      canUseRelationshipForRecommendation({
        strength: 70,
        source: "ai_inferred",
        confirmedAt: null,
      }),
    ).toBe(false);
  });

  it("requires human confirmation for AI-inferred contradictions", () => {
    expect(
      shouldRequireHumanConfirmation({
        strength: 95,
        source: "ai_inferred",
        relationshipType: "contradicts",
      }),
    ).toBe(true);
  });

  it("blocks cross-tenant relationship access", () => {
    expect(() =>
      assertSameTenantRelationship({ tenantId: "tenant_a" }, "tenant_b"),
    ).toThrow("Cross-tenant graph relationship access blocked.");
  });
});
