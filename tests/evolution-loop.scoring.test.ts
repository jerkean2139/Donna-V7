import { scoreEvolutionLoopRelease } from "../src/lib/evolution-loop/scoring";

describe("evolution loop release scoring", () => {
  it("scores a complete loop candidate at 100", () => {
    const result = scoreEvolutionLoopRelease({
      intentSummary: "Decide whether this Cognitive Object is ready for governed follow-through.",
      contextSummary: "Used tenant-scoped object context, source notes, and risk metadata.",
      assumptions: [
        {
          text: "The object contains the best available context for this MVP run.",
          riskLevel: "low",
          needsVerification: false,
        },
      ],
      optionsConsidered: [
        {
          name: "Proceed",
          summary: "Continue with current context.",
          tradeoffs: ["Fast", "Less context-rich"],
        },
        {
          name: "Request more context",
          summary: "Ask a human for missing evidence.",
          tradeoffs: ["Safer", "Slower"],
        },
      ],
      critique: [
        {
          lens: "operator",
          concern: "The loop should avoid false confidence when memory is incomplete.",
        },
      ],
      risks: [
        {
          riskLevel: "medium",
          summary: "Recommendation could be under-contextualized.",
          mitigation: "Require human review before action.",
        },
      ],
      recommendation: "Proceed only after the approval gate confirms the context is sufficient.",
      confidenceScore: 88,
      approvalRequired: true,
      approvalReason: "Medium-risk recommendation needs human review.",
    });

    expect(result.totalScore).toBe(100);
    expect(result.breakdown).toHaveLength(10);
  });

  it("penalizes missing context, options, governance explanation, and risk review", () => {
    const result = scoreEvolutionLoopRelease({
      intentSummary: "Decide next step.",
      recommendation: "Proceed.",
      confidenceScore: 70,
      approvalRequired: true,
    });

    expect(result.totalScore).toBeLessThan(98);
    expect(result.breakdown.find((item) => item.categoryId === "context")?.score).toBe(0);
    expect(result.breakdown.find((item) => item.categoryId === "options")?.score).toBe(0);
    expect(result.breakdown.find((item) => item.categoryId === "governance")?.score).toBe(0);
    expect(result.breakdown.find((item) => item.categoryId === "risk_analysis")?.score).toBe(0);
  });
});
