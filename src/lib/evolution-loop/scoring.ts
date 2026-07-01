import type {
  EvolutionLoopReleaseCandidate,
  LoopReleaseCategoryId,
  LoopReleaseScoreItem,
} from "./types";

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

const categoryLabels: Record<LoopReleaseCategoryId, string> = {
  intent: "Clear intent and problem framing",
  context: "Correct use of memory/context",
  assumptions: "Assumption detection",
  evidence: "Evidence quality",
  options: "Alternative options considered",
  risk_analysis: "Contradiction / risk analysis",
  governance: "Human approval and governance logic",
  clarity: "Simplicity and teaching clarity",
  usefulness: "Implementation usefulness",
  future_proofing: "Future-proofing / model independence",
};

function hasText(value: string | null | undefined, minLength = 12): boolean {
  return typeof value === "string" && value.trim().length >= minLength;
}

function item(categoryId: LoopReleaseCategoryId, passed: boolean, notes: string): LoopReleaseScoreItem {
  return {
    categoryId,
    label: categoryLabels[categoryId],
    score: passed ? 10 : 0,
    maxScore: 10,
    notes,
  };
}

export function calculateReleaseScore(input: ReleaseScoreInput): ReleaseScoreResult {
  const missing = criteria.filter(([key]) => !input[key]).map(([, message]) => message);
  const score = (criteria.length - missing.length) * 10;

  return {
    score,
    passed: score >= 98,
    missing,
  };
}

export function scoreEvolutionLoopRelease(candidate: EvolutionLoopReleaseCandidate): {
  totalScore: number;
  breakdown: LoopReleaseScoreItem[];
} {
  const hasAssumptions = (candidate.assumptions?.length ?? 0) > 0;
  const hasOptions = (candidate.optionsConsidered?.length ?? 0) >= 2;
  const hasCritique = (candidate.critique?.length ?? 0) > 0;
  const hasRisks = (candidate.risks?.length ?? 0) > 0;
  const hasGovernance =
    candidate.approvalRequired === false ||
    (candidate.approvalRequired === true && hasText(candidate.approvalReason, 8));

  const breakdown = [
    item("intent", hasText(candidate.intentSummary), "Intent summary must frame the object's purpose."),
    item(
      "context",
      hasText(candidate.contextSummary),
      "Context summary must explain what memory or source context was used.",
    ),
    item("assumptions", hasAssumptions, "At least one assumption must be registered."),
    item(
      "evidence",
      hasText(candidate.contextSummary) &&
        candidate.confidenceScore !== null &&
        candidate.confidenceScore !== undefined,
      "Evidence quality needs context plus a confidence score.",
    ),
    item("options", hasOptions, "At least two approaches must be considered for release review."),
    item(
      "risk_analysis",
      hasCritique && hasRisks,
      "Critique and explicit risks must both be present.",
    ),
    item(
      "governance",
      hasGovernance,
      "Approval requirement must be explicit and explained when required.",
    ),
    item("clarity", hasText(candidate.recommendation), "Recommendation must be clear enough for human review."),
    item(
      "usefulness",
      hasText(candidate.recommendation) && (candidate.confidenceScore ?? 0) >= 50,
      "Recommendation must be actionable with non-trivial confidence.",
    ),
    item(
      "future_proofing",
      hasAssumptions && hasRisks,
      "The run must name durable assumptions and risks beyond a single model response.",
    ),
  ];

  return {
    totalScore: breakdown.reduce((sum, score) => sum + score.score, 0),
    breakdown,
  };
}
