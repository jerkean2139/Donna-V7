import { InMemoryCognitiveGraphRepository } from "../src/lib/cognitive-graph/repository";
import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { InMemoryAgentRunRepository } from "../src/lib/agents/agent-run/repository";
import { InMemoryProposedActionRepository } from "../src/lib/agents/proposed-action/repository";
import {
  approveAndExecuteProposedAction,
  createProposedActionFromDraft,
  rejectProposedAction,
} from "../src/lib/agents/proposed-action/service";
import type { ProposedActionDraft } from "../src/lib/agents/types";

async function setup() {
  const objectRepository = new InMemoryCognitiveObjectRepository();
  const graphRepository = new InMemoryCognitiveGraphRepository();
  const agentRunRepository = new InMemoryAgentRunRepository();
  const proposedActionRepository = new InMemoryProposedActionRepository();

  const object = await objectRepository.create({
    tenantId: "tenant_a",
    createdByUserId: "user_1",
    objectType: "decision",
    title: "Target object",
    source: "manual",
    riskLevel: "low",
    tags: [],
  });

  const run = await agentRunRepository.create({
    tenantId: "tenant_a",
    objectId: object.id,
    agentName: "Programming",
    task: "do something",
    status: "completed",
  });

  return { objectRepository, graphRepository, agentRunRepository, proposedActionRepository, object, run };
}

const lowRiskReversibleDraft: ProposedActionDraft = {
  toolName: "create_followup_object",
  args: { title: "A follow-up", objectType: "issue" },
  description: "Create a follow-up issue",
  riskLevel: "low",
  reversible: true,
};

const irreversibleDraft: ProposedActionDraft = {
  toolName: "send_email",
  args: { to: "client@example.com", subject: "Hi", body: "..." },
  description: "Send an email",
  riskLevel: "medium",
  reversible: false,
};

describe("createProposedActionFromDraft", () => {
  it("auto-executes a low-risk reversible action when confidence clears the threshold", async () => {
    const ctx = await setup();
    const action = await createProposedActionFromDraft(
      ctx.proposedActionRepository,
      lowRiskReversibleDraft,
      {
        tenantId: "tenant_a",
        agentRunId: ctx.run.id,
        agentName: "Programming",
        objectId: ctx.object.id,
        objectRiskLevel: "low",
        confidenceScore: 98,
      },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );

    expect(action.status).toBe("executed");
    expect(action.resultSummary).toMatch(/Created follow-up/);

    // The executor's real side effect actually happened.
    const objects = await ctx.objectRepository.listByTenant("tenant_a");
    expect(objects).toHaveLength(2);
  });

  it("leaves an irreversible action in 'proposed' status no matter how high confidence is", async () => {
    const ctx = await setup();
    const action = await createProposedActionFromDraft(
      ctx.proposedActionRepository,
      irreversibleDraft,
      {
        tenantId: "tenant_a",
        agentRunId: ctx.run.id,
        agentName: "Customer Service",
        objectId: ctx.object.id,
        objectRiskLevel: "low",
        confidenceScore: 100,
      },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );

    expect(action.status).toBe("proposed");
    expect(action.approvalRequired).toBe(true);
  });

  it("leaves a low-confidence action in 'proposed' status even if the tool is low risk and reversible", async () => {
    const ctx = await setup();
    const action = await createProposedActionFromDraft(
      ctx.proposedActionRepository,
      lowRiskReversibleDraft,
      {
        tenantId: "tenant_a",
        agentRunId: ctx.run.id,
        agentName: "Programming",
        objectId: ctx.object.id,
        objectRiskLevel: "low",
        confidenceScore: 40,
      },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );

    expect(action.status).toBe("proposed");
  });
});

describe("approveAndExecuteProposedAction", () => {
  it("executes a pending action on approval", async () => {
    const ctx = await setup();
    const action = await createProposedActionFromDraft(
      ctx.proposedActionRepository,
      irreversibleDraft,
      {
        tenantId: "tenant_a",
        agentRunId: ctx.run.id,
        agentName: "Customer Service",
        objectId: ctx.object.id,
        objectRiskLevel: "low",
        confidenceScore: 100,
      },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );
    expect(action.status).toBe("proposed");

    const decided = await approveAndExecuteProposedAction(
      ctx.proposedActionRepository,
      ctx.agentRunRepository,
      { id: action.id, tenantId: "tenant_a", userId: "approver_1" },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );

    expect(decided.status).toBe("executed");
    expect(decided.decidedByUserId).toBe("approver_1");
    expect(decided.resultSummary).toMatch(/SIMULATED/);
  });

  it("refuses to approve an action that was already decided", async () => {
    const ctx = await setup();
    const action = await createProposedActionFromDraft(
      ctx.proposedActionRepository,
      irreversibleDraft,
      {
        tenantId: "tenant_a",
        agentRunId: ctx.run.id,
        agentName: "Customer Service",
        objectId: ctx.object.id,
        objectRiskLevel: "low",
        confidenceScore: 100,
      },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );

    await approveAndExecuteProposedAction(
      ctx.proposedActionRepository,
      ctx.agentRunRepository,
      { id: action.id, tenantId: "tenant_a", userId: "approver_1" },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );

    await expect(
      approveAndExecuteProposedAction(
        ctx.proposedActionRepository,
        ctx.agentRunRepository,
        { id: action.id, tenantId: "tenant_a", userId: "approver_2" },
        { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
      ),
    ).rejects.toThrow(/already been/);
  });

  it("refuses to approve an action belonging to another tenant", async () => {
    const ctx = await setup();
    const action = await createProposedActionFromDraft(
      ctx.proposedActionRepository,
      irreversibleDraft,
      {
        tenantId: "tenant_a",
        agentRunId: ctx.run.id,
        agentName: "Customer Service",
        objectId: ctx.object.id,
        objectRiskLevel: "low",
        confidenceScore: 100,
      },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );

    await expect(
      approveAndExecuteProposedAction(
        ctx.proposedActionRepository,
        ctx.agentRunRepository,
        { id: action.id, tenantId: "tenant_b_attacker", userId: "attacker" },
        { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
      ),
    ).rejects.toThrow(/not found/);
  });
});

describe("rejectProposedAction", () => {
  it("marks a pending action rejected without executing it", async () => {
    const ctx = await setup();
    const action = await createProposedActionFromDraft(
      ctx.proposedActionRepository,
      irreversibleDraft,
      {
        tenantId: "tenant_a",
        agentRunId: ctx.run.id,
        agentName: "Customer Service",
        objectId: ctx.object.id,
        objectRiskLevel: "low",
        confidenceScore: 100,
      },
      { objectRepository: ctx.objectRepository, graphRepository: ctx.graphRepository },
    );

    const rejected = await rejectProposedAction(ctx.proposedActionRepository, {
      id: action.id,
      tenantId: "tenant_a",
      userId: "reviewer_1",
    });

    expect(rejected.status).toBe("rejected");
    expect(rejected.decidedByUserId).toBe("reviewer_1");
  });
});
