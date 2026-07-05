import { InMemoryCredentialRepository } from "../src/lib/integrations/credentials/repository";
import { setCredential } from "../src/lib/integrations/credentials/service";
import { executeGhlWrite, ghlReadTool } from "../src/lib/agents/tools/ghl-tools";
import type { ToolExecutionContext } from "../src/lib/agents/types";

async function makeContext(withCredential: boolean): Promise<ToolExecutionContext> {
  const credentialRepository = new InMemoryCredentialRepository();
  if (withCredential) {
    await setCredential(credentialRepository, {
      tenantId: "tenant_a",
      provider: "ghl",
      secret: "ghl_key_123",
      userId: "user_1",
    });
  }
  return { tenantId: "tenant_a", credentialRepository };
}

describe("ghlReadTool", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-encryption-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns a clean message when GHL is not configured for the tenant", async () => {
    const context = await makeContext(false);
    const result = await ghlReadTool.execute({ endpoint: "contacts" }, context);
    expect(result).toMatch(/not configured/i);
  });

  it("cannot be tricked into targeting a non-GHL hostname via the endpoint value", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => "ok" });
    vi.stubGlobal("fetch", fetchMock);

    const context = await makeContext(true);
    await ghlReadTool.execute({ endpoint: "https://evil.example.com/steal" }, context);

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(new URL(calledUrl).hostname).toBe("services.leadconnectorhq.com");
  });

  it("makes an authenticated GET when a credential is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ contacts: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const context = await makeContext(true);
    const result = await ghlReadTool.execute({ endpoint: "contacts" }, context);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/contacts",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer ghl_key_123" }),
      }),
    );
    expect(result).toContain("contacts");
  });
});

describe("executeGhlWrite", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-encryption-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails cleanly when GHL is not configured for the tenant", async () => {
    const context = await makeContext(false);
    const result = await executeGhlWrite(context, { method: "POST", endpoint: "contacts" });
    expect(result.success).toBe(false);
    expect(result.resultSummary).toMatch(/not configured/i);
  });

  it("blocks writes to a restricted endpoint prefix", async () => {
    const context = await makeContext(true);
    const result = await executeGhlWrite(context, { method: "POST", endpoint: "users/123" });
    expect(result.success).toBe(false);
    expect(result.resultSummary).toMatch(/BLOCKED/);
  });

  it("rejects DELETE at the schema level", async () => {
    const context = await makeContext(true);
    const result = await executeGhlWrite(context, { method: "DELETE", endpoint: "contacts/123" });
    expect(result.success).toBe(false);
    expect(result.resultSummary).toMatch(/Invalid/);
  });

  it("makes an authenticated write when the endpoint is allowed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const context = await makeContext(true);
    const result = await executeGhlWrite(context, {
      method: "POST",
      endpoint: "contacts",
      data: { name: "Jane" },
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://services.leadconnectorhq.com/contacts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer ghl_key_123" }),
      }),
    );
  });

  it("reports failure on a non-ok HTTP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 500, ok: false, text: async () => "server error" });
    vi.stubGlobal("fetch", fetchMock);

    const context = await makeContext(true);
    const result = await executeGhlWrite(context, { method: "POST", endpoint: "contacts" });
    expect(result.success).toBe(false);
    expect(result.resultSummary).toMatch(/HTTP 500/);
  });
});
