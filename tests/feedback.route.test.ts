import { NextRequest } from "next/server";
import { OPTIONS, POST } from "../src/app/api/feedback/route";
import { feedbackWidgetKeyRepository, cognitiveObjectRepository } from "../src/lib/repositories";
import { mintWidgetKey } from "../src/lib/feedback/service";

function post(body: unknown, origin?: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  it("rejects an unknown widget key with 401 (and CORS headers)", async () => {
    const res = await POST(post({ publicKey: "fw_pub_nope", message: "hi" }, "https://x.com"));
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://x.com");
  });

  it("rejects a disallowed origin with 403 when the key has an allowlist", async () => {
    const tenantId = `org_fb_${crypto.randomUUID()}`;
    const key = await mintWidgetKey(feedbackWidgetKeyRepository, {
      tenantId,
      userId: "u",
      label: "site",
      allowedOrigins: ["https://allowed.com"],
    });

    const res = await POST(post({ publicKey: key.publicKey, message: "hi" }, "https://evil.com"));
    expect(res.status).toBe(403);
  });

  it("accepts valid feedback and creates a Cognitive Object", async () => {
    const tenantId = `org_fb_${crypto.randomUUID()}`;
    const key = await mintWidgetKey(feedbackWidgetKeyRepository, {
      tenantId,
      userId: "u",
      label: "site",
      allowedOrigins: [],
    });

    const res = await POST(post({ publicKey: key.publicKey, message: "great product" }, "https://any.com"));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true });

    const objects = await cognitiveObjectRepository.listByTenant(tenantId);
    expect(objects).toHaveLength(1);
    expect(objects[0]?.source).toBe("api");
  });

  it("rejects an invalid payload with 400", async () => {
    const res = await POST(post({ publicKey: "fw_pub_x" }, "https://x.com"));
    expect(res.status).toBe(400);
  });

  it("answers CORS preflight with 204 and allow headers", () => {
    const req = new NextRequest("http://localhost:3000/api/feedback", {
      method: "OPTIONS",
      headers: { origin: "https://x.com" },
    });
    const res = OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });
});
