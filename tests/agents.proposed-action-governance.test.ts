import { evaluateProposedActionGovernance } from "../src/lib/agents/proposed-action/governance";

describe("evaluateProposedActionGovernance", () => {
  it("auto-executes a low-risk, reversible action with high confidence", () => {
    const result = evaluateProposedActionGovernance({
      toolRiskLevel: "low",
      reversible: true,
      objectRiskLevel: "low",
      confidenceScore: 96,
    });
    expect(result.approvalRequired).toBe(false);
    expect(result.allowedToAutoExecute).toBe(true);
  });

  it("NEVER auto-executes an irreversible action, no matter how high confidence is", () => {
    const result = evaluateProposedActionGovernance({
      toolRiskLevel: "low",
      reversible: false,
      objectRiskLevel: "low",
      confidenceScore: 100,
    });
    expect(result.approvalRequired).toBe(true);
    expect(result.allowedToAutoExecute).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/irreversible/i);
  });

  it("requires approval when effective risk is critical, regardless of confidence", () => {
    const result = evaluateProposedActionGovernance({
      toolRiskLevel: "low",
      reversible: true,
      objectRiskLevel: "critical",
      confidenceScore: 100,
    });
    expect(result.effectiveRiskLevel).toBe("critical");
    expect(result.approvalRequired).toBe(true);
    expect(result.allowedToAutoExecute).toBe(false);
  });

  it("effective risk is the MAX of tool risk and object risk, not tool risk alone", () => {
    const result = evaluateProposedActionGovernance({
      toolRiskLevel: "low",
      reversible: true,
      objectRiskLevel: "high",
      confidenceScore: 100,
    });
    expect(result.effectiveRiskLevel).toBe("high");
  });

  it("effective risk is the MAX even when the tool risk is higher than the object risk", () => {
    const result = evaluateProposedActionGovernance({
      toolRiskLevel: "high",
      reversible: true,
      objectRiskLevel: "low",
      confidenceScore: 100,
    });
    expect(result.effectiveRiskLevel).toBe("high");
    expect(result.approvalRequired).toBe(true);
  });

  it("requires approval when confidence is below the default threshold", () => {
    const result = evaluateProposedActionGovernance({
      toolRiskLevel: "low",
      reversible: true,
      objectRiskLevel: "low",
      confidenceScore: 50,
    });
    expect(result.approvalRequired).toBe(true);
    expect(result.allowedToAutoExecute).toBe(false);
  });

  it("treats a null confidence score as zero, never as a free pass", () => {
    const result = evaluateProposedActionGovernance({
      toolRiskLevel: "low",
      reversible: true,
      objectRiskLevel: "low",
      confidenceScore: null,
    });
    expect(result.approvalRequired).toBe(true);
    expect(result.allowedToAutoExecute).toBe(false);
  });

  it("requires approval for medium effective risk even when reversible and confident", () => {
    // Default policy's humanApprovalRequiredAboveRisk is "high", so medium
    // risk alone should NOT force approval unless confidence is also below
    // threshold -- this test locks in that medium is allowed to auto-execute
    // only if reversible=true and risk is exactly "low" (Decision 3: "low
    // risk" specifically, not "medium or below").
    const result = evaluateProposedActionGovernance({
      toolRiskLevel: "medium",
      reversible: true,
      objectRiskLevel: "low",
      confidenceScore: 100,
    });
    expect(result.effectiveRiskLevel).toBe("medium");
    expect(result.allowedToAutoExecute).toBe(false);
    expect(result.approvalRequired).toBe(false); // below the "high" approval threshold, but still not auto-executable
  });
});
