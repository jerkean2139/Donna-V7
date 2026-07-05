import { InMemoryCognitiveGraphRepository } from "../src/lib/cognitive-graph/repository";
import { InMemoryCognitiveObjectRepository } from "../src/lib/cognitive-object/repository";
import { InMemoryCredentialRepository } from "../src/lib/integrations/credentials/repository";
import { setCredential } from "../src/lib/integrations/credentials/service";
import {
  CreateFollowupObjectExecutor,
  FakeSendEmailExecutor,
  GhlWriteExecutor,
  ResendSendEmailExecutor,
} from "../src/lib/agents/proposed-action/executors";
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

describe("ResendSendEmailExecutor", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-encryption-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails cleanly when Resend is not configured for the tenant", async () => {
    const credentialRepository = new InMemoryCredentialRepository();
    const executor = new ResendSendEmailExecutor(credentialRepository);
    const action = makeAction({
      toolName: "send_email",
      args: { to: "client@example.com", subject: "Update", body: "body text" },
    });

    const result = await executor.execute(action);
    expect(result.success).toBe(false);
    expect(result.resultSummary).toMatch(/not configured/i);
  });

  it("rejects invalid arguments before calling Resend", async () => {
    const credentialRepository = new InMemoryCredentialRepository();
    await setCredential(credentialRepository, {
      tenantId: "tenant_a",
      provider: "resend",
      secret: "re_key",
      userId: "user_1",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const executor = new ResendSendEmailExecutor(credentialRepository);
    const result = await executor.execute(makeAction({ toolName: "send_email", args: { to: "client@example.com" } }));

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends via the Resend API using the tenant's decrypted key", async () => {
    const credentialRepository = new InMemoryCredentialRepository();
    await setCredential(credentialRepository, {
      tenantId: "tenant_a",
      provider: "resend",
      secret: "re_key_123",
      userId: "user_1",
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email_1" }) });
    vi.stubGlobal("fetch", fetchMock);

    const executor = new ResendSendEmailExecutor(credentialRepository);
    const action = makeAction({
      toolName: "send_email",
      args: { to: "client@example.com", subject: "Update", body: "body text" },
    });

    const result = await executor.execute(action);
    expect(result.success).toBe(true);
    expect(result.resultSummary).toContain("email_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer re_key_123" }),
      }),
    );
  });

  it("reports failure on a non-ok Resend response", async () => {
    const credentialRepository = new InMemoryCredentialRepository();
    await setCredential(credentialRepository, {
      tenantId: "tenant_a",
      provider: "resend",
      secret: "re_key_123",
      userId: "user_1",
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "invalid recipient" });
    vi.stubGlobal("fetch", fetchMock);

    const executor = new ResendSendEmailExecutor(credentialRepository);
    const result = await executor.execute(
      makeAction({ toolName: "send_email", args: { to: "client@example.com", subject: "x", body: "y" } }),
    );

    expect(result.success).toBe(false);
    expect(result.resultSummary).toMatch(/HTTP 422/);
  });
});

describe("GhlWriteExecutor", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-encryption-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails cleanly when GHL is not configured for the tenant", async () => {
    const credentialRepository = new InMemoryCredentialRepository();
    const executor = new GhlWriteExecutor(credentialRepository);
    const action = makeAction({ toolName: "ghl_write", args: { method: "POST", endpoint: "contacts" } });

    const result = await executor.execute(action);
    expect(result.success).toBe(false);
    expect(result.resultSummary).toMatch(/not configured/i);
  });

  it("writes to GHL using the tenant's decrypted key", async () => {
    const credentialRepository = new InMemoryCredentialRepository();
    await setCredential(credentialRepository, {
      tenantId: "tenant_a",
      provider: "ghl",
      secret: "ghl_key_123",
      userId: "user_1",
    });
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const executor = new GhlWriteExecutor(credentialRepository);
    const action = makeAction({
      toolName: "ghl_write",
      args: { method: "POST", endpoint: "contacts", data: { name: "Jane" } },
    });

    const result = await executor.execute(action);
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/contacts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer ghl_key_123" }),
      }),
    );
  });

  it("blocks a write to a restricted endpoint even with valid credentials", async () => {
    const credentialRepository = new InMemoryCredentialRepository();
    await setCredential(credentialRepository, {
      tenantId: "tenant_a",
      provider: "ghl",
      secret: "ghl_key_123",
      userId: "user_1",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const executor = new GhlWriteExecutor(credentialRepository);
    const action = makeAction({ toolName: "ghl_write", args: { method: "POST", endpoint: "users/123" } });

    const result = await executor.execute(action);
    expect(result.success).toBe(false);
    expect(result.resultSummary).toMatch(/BLOCKED/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
