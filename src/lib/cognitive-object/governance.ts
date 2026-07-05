import type { CognitiveObject, RiskLevel } from "./types";

export interface TenantGovernancePolicy {
  defaultConfidenceThreshold: number;
  autoExecuteThreshold: number;
  humanApprovalRequiredAboveRisk: RiskLevel;
}

export interface GovernanceEvaluation {
  approvalRequired: boolean;
  reasons: string[];
  allowedToAutoExecute: boolean;
}

// Exported so other governance evaluators (e.g. proposed-action governance
// in src/lib/agents/) rank risk consistently with this one, instead of each
// defining its own ordering that could silently drift apart.
export const riskRank: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function maxRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return riskRank[a] >= riskRank[b] ? a : b;
}

const externallySensitiveTypes = new Set<CognitiveObject["objectType"]>([
  "proposal",
  "issue",
  "decision",
]);

export function requiresApprovalForRisk(
  objectRisk: RiskLevel,
  thresholdRisk: RiskLevel,
): boolean {
  return riskRank[objectRisk] >= riskRank[thresholdRisk];
}

export function evaluateCognitiveObjectGovernance(
  object: Pick<
    CognitiveObject,
    "objectType" | "riskLevel" | "confidenceScore" | "source" | "status"
  >,
  policy: TenantGovernancePolicy,
): GovernanceEvaluation {
  const reasons: string[] = [];
  const confidence = object.confidenceScore ?? 0;

  if (requiresApprovalForRisk(object.riskLevel, policy.humanApprovalRequiredAboveRisk)) {
    reasons.push(`Risk level ${object.riskLevel} meets or exceeds approval threshold.`);
  }

  if (confidence < policy.defaultConfidenceThreshold) {
    reasons.push(
      `Confidence score ${confidence} is below threshold ${policy.defaultConfidenceThreshold}.`,
    );
  }

  if (object.riskLevel === "critical") {
    reasons.push("Critical risk always requires human approval.");
  }

  if (externallySensitiveTypes.has(object.objectType) && object.riskLevel !== "low") {
    reasons.push(`${object.objectType} objects above low risk require approval.`);
  }

  if (object.status === "approval_required") {
    reasons.push("Object status already indicates approval is required.");
  }

  const approvalRequired = reasons.length > 0;
  const allowedToAutoExecute =
    !approvalRequired &&
    object.riskLevel === "low" &&
    confidence >= policy.autoExecuteThreshold;

  return {
    approvalRequired,
    reasons,
    allowedToAutoExecute,
  };
}

export const defaultTenantGovernancePolicy: TenantGovernancePolicy = {
  defaultConfidenceThreshold: 85,
  autoExecuteThreshold: 95,
  humanApprovalRequiredAboveRisk: "high",
};
