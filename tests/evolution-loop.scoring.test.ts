import { calculateReleaseScore } from "../src/lib/evolution-loop/scoring";

describe("Evolution Loop release scoring", () => {
  it("passes only when all release criteria are satisfied", () => {
    const result = calculateReleaseScore({
      intentClear: true,
      contextRetrieved: true,
      assumptionsListed: true,
      evidenceConsidered: true,
      optionsGenerated: true,
      critiqueCompleted: true,
      governanceChecked: true,
      simpleEnoughToExplain: true,
      implementationReady: true,
      futureProofed: true,
    });

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("fails when any release criterion is missing", () => {
    const result = calculateReleaseScore({
      intentClear: true,
      contextRetrieved: true,
      assumptionsListed: false,
      evidenceConsidered: true,
      optionsGenerated: true,
      critiqueCompleted: true,
      governanceChecked: true,
      simpleEnoughToExplain: true,
      implementationReady: true,
      futureProofed: true,
    });

    expect(result.score).toBe(90);
    expect(result.passed).toBe(false);
    expect(result.missing).toContain("Assumptions were not listed.");
  });
});
