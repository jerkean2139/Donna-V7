import {
  defaultTenantGovernancePolicy,
  maxRiskLevel,
  requiresApprovalForRisk,
  type TenantGovernancePolicy,
} from "../../cognitive-object/governance";
import type { RiskLevel } from "../../cognitive-object/types";

export interface ProposedActionGovernanceInput {
  toolRiskLevel: RiskLevel;
  reversible: boolean;
  objectRiskLevel: RiskLevel;
  // The confidence of the run this action came from. null when unavailable
  // (e.g. an agent run not tied to a scored Evolution Loop run) -- treated
  // as the lowest possible confidence, never as "trust it."
  confidenceScore: number | null;
}

export interface ProposedActionGovernanceEvaluation {
  effectiveRiskLevel: RiskLevel;
  // True when governance raised an explicit objection (irreversible,
  // above-threshold risk, low confidence). False does NOT mean "no human
  // needed" -- it can also be false for an action that simply didn't
  // qualify for auto-execution (e.g. medium risk, reversible, confident).
  // Either way, an action that isn't auto-executed stays in "proposed"
  // status and still needs a human to approve or reject it; this field is
  // the audit trail's explanation of why, not a visibility gate.
  approvalRequired: boolean;
  reasons: string[];
  allowedToAutoExecute: boolean;
}

// Mirrors evaluateCognitiveObjectGovernance's shape (cognitive-object/governance.ts)
// for the same reason: this is a deterministic gate, not a model output.
// Phase 2 design, Decision 3: auto-execute only when the action is low-risk,
// reversible, and confidence cleared the threshold. Decision 7: effective
// risk is the max of the tool's own risk and the object's risk -- a low-risk
// tool call on a critical-risk object is still a critical-risk situation.
export function evaluateProposedActionGovernance(
  input: ProposedActionGovernanceInput,
  policy: TenantGovernancePolicy = defaultTenantGovernancePolicy,
): ProposedActionGovernanceEvaluation {
  const reasons: string[] = [];
  const effectiveRiskLevel = maxRiskLevel(input.toolRiskLevel, input.objectRiskLevel);
  const confidence = input.confidenceScore ?? 0;

  if (!input.reversible) {
    reasons.push("Action is irreversible; human approval is always required in Phase 2.");
  }

  if (requiresApprovalForRisk(effectiveRiskLevel, policy.humanApprovalRequiredAboveRisk)) {
    reasons.push(`Effective risk level ${effectiveRiskLevel} meets or exceeds the approval threshold.`);
  }

  if (effectiveRiskLevel === "critical") {
    reasons.push("Critical risk always requires human approval.");
  }

  if (confidence < policy.defaultConfidenceThreshold) {
    reasons.push(`Confidence score ${confidence} is below threshold ${policy.defaultConfidenceThreshold}.`);
  }

  const approvalRequired = reasons.length > 0;
  const allowedToAutoExecute =
    !approvalRequired &&
    input.reversible &&
    effectiveRiskLevel === "low" &&
    confidence >= policy.autoExecuteThreshold;

  return { effectiveRiskLevel, approvalRequired, reasons, allowedToAutoExecute };
}
