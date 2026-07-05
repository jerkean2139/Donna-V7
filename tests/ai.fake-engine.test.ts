import { FakeReasoningEngine } from "../src/lib/ai/fake-engine";
import { reasoningOutputSchema } from "../src/lib/ai/schema";
import { loopReleaseCategoryIds } from "../src/lib/evolution-loop/types";

describe("FakeReasoningEngine", () => {
  it("produces output that satisfies the same schema the real engine's tool output must match", async () => {
    const engine = new FakeReasoningEngine();

    const output = await engine.reasonAboutObject({
      object: {
        id: "obj_1",
        objectType: "decision",
        title: "Ship the Q3 pricing change",
        objective: null,
        summary: "Raise the base plan price.",
        body: "Full context here.",
        riskLevel: "low",
        tags: ["pricing"],
      },
      context: [],
    });

    expect(() => reasoningOutputSchema.parse(output)).not.toThrow();
  });

  it("lowers confidence when there is no object body and no retrieved context", async () => {
    const engine = new FakeReasoningEngine();

    const output = await engine.reasonAboutObject({
      object: {
        id: "obj_1",
        objectType: "decision",
        title: "Thin object",
        objective: null,
        summary: null,
        body: null,
        riskLevel: "low",
        tags: [],
      },
      context: [],
    });

    expect(output.suggestedConfidence).toBeLessThan(60);
  });

  it("returns a judge score for every release category", async () => {
    const engine = new FakeReasoningEngine();

    const judged = await engine.scoreDecisionQuality({
      object: {
        id: "obj_1",
        objectType: "decision",
        title: "x",
        objective: null,
        summary: null,
        body: null,
        riskLevel: "low",
        tags: [],
      },
      run: {
        intentSummary: null,
        contextSummary: null,
        assumptions: [],
        optionsConsidered: [],
        critique: [],
        risks: [],
        recommendation: null,
        confidenceScore: null,
      },
    });

    expect(judged.categoryScores).toHaveLength(loopReleaseCategoryIds.length);
  });
});
