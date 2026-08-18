// The Donna Console: a conversational surface where the user talks to Donna,
// and Donna routes work to the Agent Mob behind her.

export type ConsoleRole = "user" | "donna" | "agent";

export interface ConsoleMessage {
  id: string;
  conversationId: string;
  tenantId: string;
  role: ConsoleRole;
  content: string;
  // Set when Donna routes a turn to an agent (role="donna") or when an agent
  // speaks in the thread (role="agent"). Null for plain user/Donna text.
  agentName: string | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  tenantId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConsoleMessageInput {
  conversationId: string;
  tenantId: string;
  role: ConsoleRole;
  content: string;
  agentName?: string | null;
}
