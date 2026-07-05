import { FakeReasoningEngine } from "../src/lib/ai/fake-engine";
import { reasoningOutputSchema } from "../src/lib/ai/schema";
import { loopReleaseCategoryIds } from "../src/lib/evolution-loop/types";
import { GOLDEN_SET } from "./evals/golden-set";

// This suite runs the FAKE engine over the golden set. It cannot tell you
// whether real reasoning is any good -- that's tests/evals/decision-quality
// .evalsuite.ts's job, and it requires a live ANTHROPIC_API_KEY, so it never
// runs in CI. What THIS suite guards, keylessly and deterministically, is
// the pipeline itself: every golden fixture must still produce schema-valid
// output and a complete judge score set. If someone breaks the reasoning
// contract (renames a field, drops a category), this fails without needing
// to spend a single API call.
describe("golden set pipeline regression (fake engine, deterministic)", () => {
  const engine = new FakeReasoningEngine();

  it.each(GOLDEN_SET)("$id produces schema-valid reasoning output", async (fixture) => {
    const output = await engine.reasonAboutObject(fixture.input);
    expect(() => reasoningOutputSchema.parse(output)).not.toThrow();
  });

  it.each(GOLDEN_SET)("$id produces a complete judge score set", async (fixture) => {
    const output = await engine.reasonAboutObject(fixture.input);
    const judged = await engine.scoreDecisionQuality({
      object: fixture.input.object,
      run: {
        intentSummary: output.intentSummary,
        contextSummary: output.contextSummary,
        assumptions: output.assumptions,
        optionsConsidered: output.optionsConsidered,
        critique: output.critique,
        risks: output.risks,
        recommendation: output.recommendation,
        confidenceScore: output.suggestedConfidence,
      },
    });

    expect(judged.categoryScores).toHaveLength(loopReleaseCategoryIds.length);
    expect(judged.categoryScores.map((s) => s.categoryId).sort()).toEqual([...loopReleaseCategoryIds].sort());
  });

  it("is deterministic: the same fixture produces the same suggestedConfidence across runs", async () => {
    for (const fixture of GOLDEN_SET) {
      const first = await engine.reasonAboutObject(fixture.input);
      const second = await engine.reasonAboutObject(fixture.input);
      expect(second.suggestedConfidence).toBe(first.suggestedConfidence);
    }
  });

  it("covers a mix of quality bands, not just easy cases", () => {
    const bands = new Set(GOLDEN_SET.map((f) => f.expectedQualityBand));
    expect(bands).toEqual(new Set(["strong", "moderate", "weak"]));
  });

  it("covers every risk level", () => {
    const riskLevels = new Set(GOLDEN_SET.map((f) => f.input.object.riskLevel));
    expect(riskLevels).toEqual(new Set(["low", "medium", "high", "critical"]));
  });
});
