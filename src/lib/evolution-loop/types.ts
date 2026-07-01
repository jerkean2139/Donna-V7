import type { RiskLevel } from "../cognitive-object/types";

export const EVOLUTION_LOOP_VERSION = "mvp-1";
export const RELEASE_READY_SCORE = 98;

export const loopReleaseCategoryIds = [
  "intent",
  "context",
  "assumptions",
  "evidence",
  "options",
  "risk_analysis",
  "governance",
  "clarity",
  "usefulness",
  "future_proofing",
] as const;

export type LoopReleaseCategoryId = (typeof loopReleaseCategoryIds)[number];

export interface LoopAssumption {
  text: string;
  riskLevel: RiskLevel;
  needsVerification: boolean;
}

export interface LoopOption {
  name: string;
  summary: string;
  tradeoffs: string[];
}

export interface LoopCritique {
  lens: string;
  concern: string;
}

export interface LoopRisk {
  riskLevel: RiskLevel;
  summary: string;
  mitigation: string;
}

export interface LoopReleaseScoreItem {
  categoryId: LoopReleaseCategoryId;
  label: string;
  score: number;
  maxScore: 10;
  notes: string;
}

export interface EvolutionLoopRun {
  id: string;
  tenantId: string;
  objectId: string;
  loopVersion: string;
  intentSummary: string | null;
  hiddenGoal: string | null;
  contextSummary: string | null;
  assumptions: LoopAssumption[];
  optionsConsidered: LoopOption[];
  critique: LoopCritique[];
  risks: LoopRisk[];
  recommendation: string | null;
  confidenceScore: number | null;
  releaseScore: number | null;
  releaseScoreBreakdown: LoopReleaseScoreItem[];
  approvalRequired: boolean;
  approvalReason: string | null;
  createdAt: Date;
}

export interface CreateEvolutionLoopRunInput {
  tenantId: string;
  objectId: string;
  loopVersion?: string;
  intentSummary?: string | null;
  hiddenGoal?: string | null;
  contextSummary?: string | null;
  assumptions?: LoopAssumption[];
  optionsConsidered?: LoopOption[];
  critique?: LoopCritique[];
  risks?: LoopRisk[];
  recommendation?: string | null;
  confidenceScore?: number | null;
  releaseScore?: number | null;
  releaseScoreBreakdown?: LoopReleaseScoreItem[];
  approvalRequired?: boolean;
  approvalReason?: string | null;
}

export interface EvolutionLoopReleaseCandidate {
  intentSummary?: string | null;
  contextSummary?: string | null;
  assumptions?: LoopAssumption[];
  optionsConsidered?: LoopOption[];
  critique?: LoopCritique[];
  risks?: LoopRisk[];
  recommendation?: string | null;
  confidenceScore?: number | null;
  approvalRequired?: boolean;
  approvalReason?: string | null;
}
