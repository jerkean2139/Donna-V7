export interface ReleaseScoreInput {
  intentClear: boolean;
  contextRetrieved: boolean;
  assumptionsListed: boolean;
  evidenceConsidered: boolean;
  optionsGenerated: boolean;
  critiqueCompleted: boolean;
  governanceChecked: boolean;
  simpleEnoughToExplain: boolean;
  implementationReady: boolean;
  futureProofed: boolean;
}

export interface ReleaseScoreResult {
  score: number;
  passed: boolean;
  missing: string[];
}

const criteria: Array<[keyof ReleaseScoreInput, string]> = [
  ["intentClear", "Intent is not clear."],
  ["contextRetrieved", "Relevant context was not retrieved."],
  ["assumptionsListed", "Assumptions were not listed."],
  ["evidenceConsidered", "Evidence was not considered."],
  ["optionsGenerated", "Multiple options were not generated."],
  ["critiqueCompleted", "Critique pass was not completed."],
  ["governanceChecked", "Governance was not checked."],
  ["simpleEnoughToExplain", "Output is not simple enough to explain."],
  ["implementationReady", "Output is not implementation-ready."],
  ["futureProofed", "Legacy Loop / future-proofing check was not completed."],
];

export function calculateReleaseScore(input: ReleaseScoreInput): ReleaseScoreResult {
  const missing = criteria.filter(([key]) => !input[key]).map(([, message]) => message);
  const score = (criteria.length - missing.length) * 10;

  return {
    score,
    passed: score >= 98,
    missing,
  };
}
