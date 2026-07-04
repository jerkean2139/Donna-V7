import type { JudgeInput, JudgeOutput, ReasoningEngine, ReasoningInput, ReasoningOutput } from "./types";
import { loopReleaseCategoryIds } from "../evolution-loop/types";

// Deterministic, keyless, no-network engine. Used whenever ANTHROPIC_API_KEY
// is unset (local dev without a key, CI, and every existing test) so the
// product keeps working end-to-end without external dependencies, matching
// the in-memory-repository fallback pattern already used in repositories.ts.
//
// This intentionally mirrors the OLD buildRunDraft() behavior in
// evolution-loop/service.ts's history, so the existing test suite (which
// asserts against MVP-quality output, not real reasoning) keeps passing
// unchanged.
export class FakeReasoningEngine implements ReasoningEngine {
  async reasonAboutObject(input: ReasoningInput): Promise<ReasoningOutput> {
    const hasBody = Boolean(input.object.body);
    const hasContext = input.context.length > 0;
    const citedIds = input.context.slice(0, 2).map((item) => item.objectId);

    const contextSummary = hasContext
      ? `Used ${input.context.length} retrieved context item(s) plus the object's own summary and body.`
      : hasBody
        ? "Used the stored Cognitive Object body, summary, tags, risk level, and object type as context. No related context was retrieved."
        : "Used the stored Cognitive Object metadata and summary as context. No full body was provided and no related context was retrieved.";

    return {
      intentSummary: `Clarify and improve the quality of: ${input.object.title}`,
      contextSummary,
      assumptions: [
        {
          text: "The stored Cognitive Object and retrieved context contain the best available context for this run.",
          riskLevel: hasBody ? "low" : "medium",
          needsVerification: !hasBody,
          sourceObjectIds: citedIds,
        },
      ],
      optionsConsidered: [
        {
          name: "Proceed with current context",
          summary: "Use the object and retrieved context as captured; apply governance immediately.",
          tradeoffs: ["Fastest path", "May miss context not yet connected in the graph"],
        },
        {
          name: "Request more context",
          summary: "Hold execution until the human adds more evidence or source material.",
          tradeoffs: ["Improves confidence", "Slows delivery"],
        },
      ],
      critique: [
        {
          lens: "operator",
          concern: hasContext
            ? "Retrieved context may not cover every relevant prior decision; verify strength/relationship types are still accurate."
            : "No related context was available, so this reasoning rests entirely on the object's own content.",
        },
      ],
      risks: [
        {
          riskLevel: input.object.riskLevel,
          summary: `The object is marked ${input.object.riskLevel} risk.`,
          mitigation: "Route through human approval before action.",
          sourceObjectIds: citedIds,
        },
      ],
      recommendation: hasContext
        ? "Treat this Cognitive Object as ready for review, informed by the retrieved context."
        : "Treat this Cognitive Object as ready for low-risk follow-through with outcome learning after execution.",
      suggestedConfidence: hasContext ? 70 : hasBody ? 55 : 40,
      confidenceRationale: hasContext
        ? "Moderate confidence: some related context was retrieved and cited."
        : "Lower confidence: no related context was retrieved to support the assumptions.",
    };
  }

  async scoreDecisionQuality(_input: JudgeInput): Promise<JudgeOutput> {
    return {
      categoryScores: loopReleaseCategoryIds.map((categoryId) => ({
        categoryId,
        score: 7,
        rationale: "Fake judge: fixed score, no live grading available without an API key.",
      })),
      overallNotes: "Fake judge engine active (no ANTHROPIC_API_KEY set). Scores are placeholders.",
    };
  }
}
