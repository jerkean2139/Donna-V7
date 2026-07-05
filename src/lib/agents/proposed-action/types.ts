import type { RiskLevel } from "../../cognitive-object/types";

export const proposedActionStatuses = ["proposed", "approved", "rejected", "executed", "failed"] as const;
export type ProposedActionStatus = (typeof proposedActionStatuses)[number];

export interface ProposedAction {
  id: string;
  tenantId: string;
  agentRunId: string;
  objectId: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  effectiveRiskLevel: RiskLevel;
  reversible: boolean;
  status: ProposedActionStatus;
  approvalRequired: boolean;
  approvalReason: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  resultSummary: string | null;
  createdAt: Date;
}

export interface CreateProposedActionInput {
  tenantId: string;
  agentRunId: string;
  objectId: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  effectiveRiskLevel: RiskLevel;
  reversible: boolean;
  approvalRequired: boolean;
  approvalReason: string | null;
  status?: ProposedActionStatus;
}
