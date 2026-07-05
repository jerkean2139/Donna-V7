import { InMemoryCognitiveGraphRepository } from "../src/lib/cognitive-graph/repository";
import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { CreateFollowupObjectExecutor, FakeSendEmailExecutor } from "../src/lib/agents/proposed-action/executors";
import type { ProposedAction } from "../src/lib/agents/proposed-action/types";

function makeAction(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: "action_1",
    tenantId: "tenant_a",
    agentRunId: "run_1",
    objectId: "obj_1",
    toolName: "create_followup_object",
    args: {},
    description: "test",
    effectiveRiskLevel: "low",
    reversible: true,
    status: "proposed",
    approvalRequired: false,
    approvalReason: null,
    decidedByUserId: null,
    decidedAt: null,
    resultSummary: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("CreateFollowupObjectExecutor", () => {
  it("creates a real Cognitive Object and links it back with a resulted_in edge", async () => {
    const objectRepository = new InMemoryCognitiveObjectRepository();
    const graphRepository = new InMemoryCognitiveGraphRepository();
    const executor = new CreateFollowupObjectExecutor(objectRepository, graphRepository, "Programming");

    const original = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Original decision",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    const action = makeAction({
      tenantId: "tenant_a",
      objectId: original.id,
      args: { title: "Follow up on this", objectType: "issue", summary: "details" },
    });

    const result = await executor.execute(action);
    expect(result.success).toBe(true);

    const objects = await objectRepository.listByTenant("tenant_a");
    expect(objects).toHaveLength(2);
    const followup = objects.find((o) => o.id !== original.id);
    expect(followup?.title).toBe("Follow up on this");
    expect(followup?.source).toBe("system");
    expect(followup?.createdByUserId).toBe("agent:Programming");

    const edges = await graphRepository.listOutgoingEdges(original.id, "tenant_a");
    expect(edges).toHaveLength(1);
    expect(edges[0]?.relationshipType).toBe("resulted_in");
    expect(edges[0]?.toObjectId).toBe(followup?.id);
  });

  it("defaults to objectType 'issue' when the arg is missing or invalid", async () => {
    const objectRepository = new InMemoryCognitiveObjectRepository();
    const graphRepository = new InMemoryCognitiveGraphRepository();
    const executor = new CreateFollowupObjectExecutor(objectRepository, graphRepository, "Programming");

    const original = await objectRepository.create({
      tenantId: "tenant_a",
      createdByUserId: "user_1",
      objectType: "decision",
      title: "Original",
      source: "manual",
      riskLevel: "low",
      tags: [],
    });

    await executor.execute(makeAction({ tenantId: "tenant_a", objectId: original.id, args: { title: "x" } }));

    const objects = await objectRepository.listByTenant("tenant_a");
    const followup = objects.find((o) => o.id !== original.id);
    expect(followup?.objectType).toBe("issue");
  });
});

describe("FakeSendEmailExecutor", () => {
  it("records a simulated success without making a real network call", async () => {
    const executor = new FakeSendEmailExecutor();
    const action = makeAction({
      toolName: "send_email",
      args: { to: "client@example.com", subject: "Update", body: "..." },
    });

    const result = await executor.execute(action);
    expect(result.success).toBe(true);
    expect(result.resultSummary).toMatch(/SIMULATED/);
    expect(result.resultSummary).toContain("client@example.com");
  });
});
