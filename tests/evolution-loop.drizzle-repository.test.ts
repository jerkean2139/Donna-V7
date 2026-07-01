import {
  toCreateLoopRunValues,
  toEvolutionLoopRun,
} from "../src/lib/evolution-loop/repository";

describe("drizzle evolution loop repository mapping", () => {
  it("builds insert values with tenant and object scope preserved", () => {
    const values = toCreateLoopRunValues({
      tenantId: "tenant_a",
      objectId: "11111111-1111-1111-1111-111111111111",
      intentSummary: "Clarify the object before action.",
      confidenceScore: 85,
      approvalRequired: true,
      approvalReason: "High-risk action needs review.",
    });

    expect(values.tenantId).toBe("tenant_a");
    expect(values.objectId).toBe("11111111-1111-1111-1111-111111111111");
    expect(values.loopVersion).toBe("mvp-1");
    expect(values.assumptions).toEqual([]);
    expect(values.releaseScoreBreakdown).toEqual([]);
    expect(values.approvalRequired).toBe(true);
    expect(values.approvalReason).toBe("High-risk action needs review.");
  });

  it("maps a stored row back to a loop run record", () => {
    const createdAt = new Date("2026-07-01T12:00:00.000Z");

    const run = toEvolutionLoopRun({
      id: "22222222-2222-2222-2222-222222222222",
      tenantId: "tenant_a",
      objectId: "11111111-1111-1111-1111-111111111111",
      loopVersion: "mvp-1",
      intentSummary: "Clarify intent.",
      hiddenGoal: null,
      contextSummary: "Used tenant-scoped object context.",
      assumptions: [
        {
          text: "Stored context is current.",
          riskLevel: "low",
          needsVerification: false,
        },
      ],
      optionsConsidered: [],
      critique: [],
      risks: [],
      recommendation: "Proceed after review.",
      confidenceScore: 90,
      releaseScore: 80,
      releaseScoreBreakdown: [],
      approvalRequired: true,
      approvalReason: "Human approval required.",
      createdAt,
    });

    expect(run.tenantId).toBe("tenant_a");
    expect(run.objectId).toBe("11111111-1111-1111-1111-111111111111");
    expect(run.assumptions[0]?.text).toBe("Stored context is current.");
    expect(run.createdAt).toBe(createdAt);
  });
});
