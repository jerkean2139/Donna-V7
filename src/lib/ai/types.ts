import type { RiskLevel } from "../cognitive-object/types";
import type {
  LoopAssumption,
  LoopCritique,
  LoopOption,
  LoopReleaseCategoryId,
  LoopRisk,
} from "../evolution-loop/types";

// A single retrieved context item the model may cite when reasoning. Always
// tenant-scoped and labeled with enough metadata for the model to weigh it
// (relationship type + strength) and for a human to audit why it was pulled in.
export interface RetrievedContextItem {
  objectId: string;
  objectType: string;
  title: string;
  summary: string | null;
  relationshipType: string | null;
  strength: number | null;
  retrievalMethod: "graph" | "semantic";
}

export interface ReasoningInput {
  object: {
    id: string;
    objectType: string;
    title: string;
    objective: string | null;
    summary: string | null;
    body: string | null;
    riskLevel: RiskLevel;
    tags: string[];
  };
  context: RetrievedContextItem[];
}

// A provenance-carrying assumption/risk: which retrieved context items (if
// any) informed it. Empty sourceObjectIds means the model asserted it without
// citing evidence, which the loop uses to discount confidence (see
// applyEvidenceDiscount in service.ts).
export interface SourcedAssumption extends LoopAssumption {
  sourceObjectIds: string[];
}

export interface SourcedRisk extends LoopRisk {
  sourceObjectIds: string[];
}

export interface ReasoningOutput {
  intentSummary: string;
  contextSummary: string;
  assumptions: SourcedAssumption[];
  optionsConsidered: LoopOption[];
  critique: LoopCritique[];
  risks: SourcedRisk[];
  recommendation: string;
  // The model's own confidence estimate. This is NEVER used directly to
  // decide approval — evaluateCognitiveObjectGovernance() is the sole
  // authority on that, per the Phase 1 trust boundary. suggestedConfidence
  // is an input to governance, not a substitute for it.
  suggestedConfidence: number;
  confidenceRationale: string;
}

export interface JudgeCategoryScore {
  categoryId: LoopReleaseCategoryId;
  score: number; // 0-10
  rationale: string;
}

export interface JudgeInput {
  object: ReasoningInput["object"];
  run: {
    intentSummary: string | null;
    contextSummary: string | null;
    assumptions: LoopAssumption[];
    optionsConsidered: LoopOption[];
    critique: LoopCritique[];
    risks: LoopRisk[];
    recommendation: string | null;
    confidenceScore: number | null;
  };
}

export interface JudgeOutput {
  categoryScores: JudgeCategoryScore[];
  overallNotes: string;
}

export interface ReasoningEngine {
  reasonAboutObject(input: ReasoningInput): Promise<ReasoningOutput>;
  scoreDecisionQuality(input: JudgeInput): Promise<JudgeOutput>;
}
