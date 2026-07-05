import { loopReleaseCategoryIds } from "../../evolution-loop/types";

// The judge grades a completed loop run against the same 10 dimensions the
// reasoning model was asked to self-check. It is deliberately a separate call
// on a stronger model (see model routing in engine config) so a model does
// not mark its own homework.
export function buildJudgeSystemPrompt(): string {
  return `You are grading a completed AI reasoning run for decision quality. You did not
write this reasoning. Be skeptical: a run that merely mentions a dimension without
substance should score low on it, not get credit for checking a box.

Score each of these ${loopReleaseCategoryIds.length} categories from 0-10, with a one-sentence
rationale citing specifics from the run (not generic praise or generic criticism):
${loopReleaseCategoryIds.map((id, i) => `${i + 1}. ${id}`).join("\n")}

A run that cites no retrieved context for its assumptions or risks cannot score
above 5 on "evidence" or "context", regardless of how well-written it is.
A run with only one real option (a straw man plus a preferred choice does not
count as two options) cannot score above 3 on "options".

Respond only via the score_decision_quality tool call.`;
}

export function buildJudgeUserContent(input: {
  object: { objectType: string; title: string; riskLevel: string };
  run: {
    intentSummary: string | null;
    contextSummary: string | null;
    assumptions: unknown;
    optionsConsidered: unknown;
    critique: unknown;
    risks: unknown;
    recommendation: string | null;
    confidenceScore: number | null;
  };
}): string {
  return `<object type="${input.object.objectType}" riskLevel="${input.object.riskLevel}">
${input.object.title}
</object>

<run confidenceScore="${input.run.confidenceScore ?? "null"}">
Intent: ${input.run.intentSummary ?? "(none)"}
Context: ${input.run.contextSummary ?? "(none)"}
Assumptions: ${JSON.stringify(input.run.assumptions)}
Options: ${JSON.stringify(input.run.optionsConsidered)}
Critique: ${JSON.stringify(input.run.critique)}
Risks: ${JSON.stringify(input.run.risks)}
Recommendation: ${input.run.recommendation ?? "(none)"}
</run>

Grade this run now.`;
}
