import { AnthropicReasoningEngine } from "../../src/lib/ai/anthropic-engine";
import { loadAiConfig } from "../../src/lib/ai/config";
import type { JudgeOutput } from "../../src/lib/ai/types";
import { GOLDEN_SET, type QualityBand } from "./golden-set";

// Live eval suite: runs the REAL Anthropic reasoning engine + judge against
// the golden set and asserts scores land in the expected direction for each
// fixture's designed quality band. Requires ANTHROPIC_API_KEY -- skips
// entirely (not failing) when unset, so this never blocks CI or a
// keyless dev setup. Run explicitly: `npm run test:evals`.
//
// This measures REAL quality drift (prompt changes, model deprecations,
// judge miscalibration). The always-on regression suite in
// tests/ai.golden-set-regression.test.ts only checks pipeline shape with the
// fake engine and cannot catch any of that.
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

// One-directional thresholds per band, not overlapping ranges: strong/moderate
// assert a floor (reasoning should be at least this good), weak asserts a
// ceiling (reasoning should be caught as this bad, not scored generously).
const BAND_THRESHOLDS: Record<QualityBand, { minAvg?: number; maxAvg?: number }> = {
  strong: { minAvg: 7.0 },
  moderate: { minAvg: 5.0 },
  weak: { maxAvg: 5.5 },
};

function averageScore(judged: JudgeOutput): number {
  const total = judged.categoryScores.reduce((sum, s) => sum + s.score, 0);
  return total / judged.categoryScores.length;
}

function categoryScore(judged: JudgeOutput, categoryId: string): number | undefined {
  return judged.categoryScores.find((s) => s.categoryId === categoryId)?.score;
}

describe.skipIf(!hasKey)("decision quality eval (live Anthropic engine)", () => {
  // Constructed lazily in beforeAll, not at describe-body top level: the
  // describe callback body always runs during test collection regardless of
  // skipIf (only the hooks and tests inside are skipped), so constructing
  // the engine here would throw on missing ANTHROPIC_API_KEY even when the
  // whole suite is meant to be skipped.
  let engine: AnthropicReasoningEngine;
  const results: Array<{ id: string; band: QualityBand; avg: number }> = [];

  beforeAll(() => {
    engine = new AnthropicReasoningEngine(loadAiConfig());
  });

  afterAll(() => {
    if (results.length === 0) return;
    console.log("\n--- Decision quality eval results ---");
    for (const r of results) {
      console.log(`  ${r.id.padEnd(32)} band=${r.band.padEnd(9)} avg=${r.avg.toFixed(1)}`);
    }
  });

  it.each(GOLDEN_SET)(
    "$id scores appropriately for its $expectedQualityBand band",
    async (fixture) => {
      const reasoning = await engine.reasonAboutObject(fixture.input);
      const judged = await engine.scoreDecisionQuality({
        object: fixture.input.object,
        run: {
          intentSummary: reasoning.intentSummary,
          contextSummary: reasoning.contextSummary,
          assumptions: reasoning.assumptions,
          optionsConsidered: reasoning.optionsConsidered,
          critique: reasoning.critique,
          risks: reasoning.risks,
          recommendation: reasoning.recommendation,
          confidenceScore: reasoning.suggestedConfidence,
        },
      });

      const avg = averageScore(judged);
      results.push({ id: fixture.id, band: fixture.expectedQualityBand, avg });

      const threshold = BAND_THRESHOLDS[fixture.expectedQualityBand];
      if (threshold.minAvg !== undefined) {
        expect(avg).toBeGreaterThanOrEqual(threshold.minAvg);
      }
      if (threshold.maxAvg !== undefined) {
        expect(avg).toBeLessThanOrEqual(threshold.maxAvg);
      }

      // Fixtures with no retrieved context must not be graded generously on
      // evidence/context -- the judge prompt explicitly forbids this.
      if (fixture.input.context.length === 0) {
        const evidenceLike = ["context", "evidence"]
          .map((id) => categoryScore(judged, id))
          .filter((score): score is number => score !== undefined);
        for (const score of evidenceLike) {
          expect(score).toBeLessThanOrEqual(5);
        }
      }
    },
  );
});
