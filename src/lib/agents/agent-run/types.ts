import type { DelegationRequest, ToolCallRecord } from "../types";

export type AgentRunStatus = "completed" | "failed";

export interface AgentRun {
  id: string;
  tenantId: string;
  objectId: string;
  agentName: string;
  task: string;
  status: AgentRunStatus;
  responseText: string | null;
  toolCalls: ToolCallRecord[];
  delegationRequest: DelegationRequest | null;
  createdAt: Date;
}

export interface CreateAgentRunInput {
  tenantId: string;
  objectId: string;
  agentName: string;
  task: string;
  status: AgentRunStatus;
  responseText?: string | null;
  toolCalls?: ToolCallRecord[];
  delegationRequest?: DelegationRequest | null;
}
