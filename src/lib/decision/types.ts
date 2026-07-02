import type {
  CognitiveObjectOutcome,
  CognitiveObjectStatus,
  RiskLevel,
} from "../cognitive-object/types";
import type {
  LoopAssumption,
  LoopCritique,
  LoopOption,
  LoopRisk,
} from "../evolution-loop/types";

// A Decision Object is the aggregate read model for a `decision` Cognitive
// Object: its own identity/governance fields plus the reasoning captured by
// its most recent Evolution Loop run. It is assembled on read, not stored
// separately — the underlying data lives in the cognitive object and loop run
// records.
export interface DecisionObjectView {
  id: string;
  tenantId: string;
  projectId: string | null;
  createdByUserId: string;
  title: string;
  objective: string | null;
  status: CognitiveObjectStatus;
  riskLevel: RiskLevel;
  confidenceScore: number | null;

  // Reasoning drawn from the latest Evolution Loop run (null/empty if none yet).
  hiddenGoal: string | null;
  contextSummary: string | null;
  assumptions: LoopAssumption[];
  optionsConsidered: LoopOption[];
  critique: LoopCritique[];
  risks: LoopRisk[];
  recommendation: string | null;
  approvalRequired: boolean;
  approvalReason: string | null;

  // Recorded outcomes / lessons after execution (newest first).
  outcomes: CognitiveObjectOutcome[];

  // Loop provenance.
  loopRunCount: number;
  latestLoopRunAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}
