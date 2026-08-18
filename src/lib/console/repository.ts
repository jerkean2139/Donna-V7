import type {
  Conversation,
  ConsoleMessage,
  CreateConsoleMessageInput,
} from "./types";

export interface ConversationRepository {
  createConversation(tenantId: string, title: string): Promise<Conversation>;
  getOrCreateActive(tenantId: string): Promise<Conversation>;
  appendMessage(input: CreateConsoleMessageInput): Promise<ConsoleMessage>;
  listMessages(conversationId: string, tenantId: string): Promise<ConsoleMessage[]>;
}

// In-memory conversation store for the first Donna Console slice. Conversations
// are ephemeral (reset on restart); Drizzle-backed persistence is the next
// phase. Kept tenant-scoped so nothing leaks across workspaces.
export class InMemoryConversationRepository implements ConversationRepository {
  private readonly conversations = new Map<string, Conversation>();
  private readonly messages = new Map<string, ConsoleMessage[]>();
  private readonly activeByTenant = new Map<string, string>();

  async createConversation(tenantId: string, title: string): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      tenantId,
      title,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    this.activeByTenant.set(tenantId, conversation.id);
    return conversation;
  }

  async getOrCreateActive(tenantId: string): Promise<Conversation> {
    const activeId = this.activeByTenant.get(tenantId);
    const existing = activeId ? this.conversations.get(activeId) : undefined;
    if (existing && existing.tenantId === tenantId) {
      return existing;
    }
    return this.createConversation(tenantId, "Conversation with Donna");
  }

  async appendMessage(input: CreateConsoleMessageInput): Promise<ConsoleMessage> {
    const conversation = this.conversations.get(input.conversationId);
    if (!conversation || conversation.tenantId !== input.tenantId) {
      throw new Error("Conversation not found for tenant.");
    }

    const message: ConsoleMessage = {
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      tenantId: input.tenantId,
      role: input.role,
      content: input.content,
      agentName: input.agentName ?? null,
      objectId: input.objectId ?? null,
      proposedActionCount: input.proposedActionCount ?? 0,
      createdAt: new Date(),
    };

    this.messages.get(input.conversationId)!.push(message);
    conversation.updatedAt = message.createdAt;
    return message;
  }

  async listMessages(conversationId: string, tenantId: string): Promise<ConsoleMessage[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      return [];
    }
    return [...(this.messages.get(conversationId) ?? [])];
  }
}

// Module singleton so the store survives across requests within a running
// process (in-memory MVP). Swapped for a Drizzle-backed repo in the next phase.
export const conversationRepository: ConversationRepository = new InMemoryConversationRepository();
