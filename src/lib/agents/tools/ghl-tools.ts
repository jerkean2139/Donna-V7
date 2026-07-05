import { z } from "zod";
import { getDecryptedCredential } from "../../integrations/credentials/service";
import type { ToolExecutionContext } from "../types";
import type { ActToolSpec } from "./act-tools";
import type { ReadToolSpec } from "./read-tools";

// Ported from KOB v2's ghl_api (donna/agent_tools.py). That tool took method
// + endpoint + data together and branched on method at call time; here the
// read/act split (Phase 2 design, Decision 1) means GET is a separate tool
// from POST/PUT/PATCH, so the split is enforced by which tool the agent can
// call at all, not just by a runtime check.
const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_ALLOWED_HOSTNAMES = new Set(["services.leadconnectorhq.com", "rest.gohighlevel.com"]);

// Write-only guardrail: endpoints that can modify billing, users, or
// account-level settings are blocked even though the write tool otherwise
// has credentials to call anything. Kept as a hostname-agnostic prefix match
// against the canonicalized endpoint, exactly as in the original.
const GHL_BLOCKED_ENDPOINT_PREFIXES = [
  "locations/",
  "users/",
  "oauth/",
  "saas-api/",
  "snapshots/",
  "companies/",
  "payments/",
  "invoices/",
];

function canonicalizeEndpoint(rawEndpoint: string): string {
  let endpoint = decodeURIComponent(rawEndpoint).replace(/\\/g, "/");
  while (endpoint.includes("..")) {
    endpoint = endpoint.replace(/\.\./g, "");
  }
  return endpoint.replace(/^\/+|\/+$/g, "");
}

function assertTargetsGhl(endpoint: string): void {
  const url = new URL(`${GHL_BASE_URL}/${endpoint}`);
  if (!GHL_ALLOWED_HOSTNAMES.has(url.hostname)) {
    throw new Error(`BLOCKED: URL does not target GoHighLevel API (${url.hostname}).`);
  }
}

const ghlReadInputSchema = z.object({
  endpoint: z.string().min(1),
});

// Read tool: GET only, executed inline (never proposed -- it changes
// nothing). GHL_ALLOWED_READONLY from the original is documentary there
// too (defined but not enforced beyond the hostname check), so this is a
// faithful port, not a narrowing: any GET on a GHL hostname is allowed.
// Uses the shared ToolExecutionContext (not a factory) since every read
// tool now receives tenant context uniformly -- see read-tools.ts.
export const ghlReadTool: ReadToolSpec = {
  name: "ghl_read",
  description: "Read data from the GoHighLevel API (GET only). Input: endpoint path, e.g. 'contacts'.",
  kind: "read",
  inputSchema: ghlReadInputSchema,
  async execute(rawArgs, context: ToolExecutionContext) {
    const { endpoint: rawEndpoint } = ghlReadInputSchema.parse(rawArgs);
    const apiKey = await getDecryptedCredential(context.credentialRepository, context.tenantId, "ghl");
    if (!apiKey) {
      return "GHL is not configured for this tenant. Ask an admin to add a GHL API key in integration settings.";
    }

    const endpoint = canonicalizeEndpoint(rawEndpoint);
    try {
      assertTargetsGhl(endpoint);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }

    try {
      const response = await fetch(`${GHL_BASE_URL}/${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 401) {
        return "GHL API: Unauthorized. This scope may not be enabled for this API key.";
      }
      const text = await response.text();
      return text.slice(0, 3000);
    } catch (error) {
      return `GHL API error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

const ghlWriteInputSchema = z.object({
  // DELETE is not a valid value here at all -- schema-level prevention,
  // stronger than the original's runtime method check.
  method: z.enum(["POST", "PUT", "PATCH"]),
  endpoint: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
});

// Act tool: high risk, irreversible (matches Phase 2 design, Decision 7's
// risk table exactly) -- a write to a live CRM can't be undone by this
// system, so it never auto-executes regardless of confidence.
export const ghlWriteTool: ActToolSpec = {
  name: "ghl_write",
  description:
    "Create or update data in GoHighLevel (POST/PUT/PATCH). Input: method, endpoint, optional data. " +
    "DELETE is never allowed. Writes to locations/users/oauth/billing/payments/invoices are blocked. " +
    "Always requires human approval.",
  kind: "act",
  riskLevel: "high",
  reversible: false,
  inputSchema: ghlWriteInputSchema,
  describeAction(rawArgs) {
    const { method, endpoint } = ghlWriteInputSchema.parse(rawArgs);
    return `${method} to GoHighLevel: ${canonicalizeEndpoint(endpoint)}`;
  },
};

export interface GhlWriteExecutionResult {
  success: boolean;
  resultSummary: string;
}

// Called by the proposed-action executor once governance clears this action
// (which in practice means "after human approval" -- Decision 3 makes
// high-risk irreversible actions never auto-execute).
export async function executeGhlWrite(
  context: ToolExecutionContext,
  args: Record<string, unknown>,
): Promise<GhlWriteExecutionResult> {
  const parsed = ghlWriteInputSchema.safeParse(args);
  if (!parsed.success) {
    return { success: false, resultSummary: "Invalid GHL write arguments." };
  }
  const { method, endpoint: rawEndpoint, data } = parsed.data;

  const apiKey = await getDecryptedCredential(context.credentialRepository, context.tenantId, "ghl");
  if (!apiKey) {
    return { success: false, resultSummary: "GHL is not configured for this tenant." };
  }

  const endpoint = canonicalizeEndpoint(rawEndpoint);
  try {
    assertTargetsGhl(endpoint);
  } catch (error) {
    return { success: false, resultSummary: error instanceof Error ? error.message : String(error) };
  }

  const blocked = GHL_BLOCKED_ENDPOINT_PREFIXES.find((prefix) => endpoint.startsWith(prefix));
  if (blocked) {
    return {
      success: false,
      resultSummary: `BLOCKED: writes to '${blocked.replace(/\/$/, "")}' are restricted -- this endpoint can modify billing, users, or account settings.`,
    };
  }

  try {
    const response = await fetch(`${GHL_BASE_URL}/${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 401) {
      return { success: false, resultSummary: "GHL API: Unauthorized. This scope may not be enabled for this API key." };
    }
    if (!response.ok) {
      const body = await response.text();
      return { success: false, resultSummary: `GHL API error: HTTP ${response.status} -- ${body.slice(0, 200)}` };
    }
    return { success: true, resultSummary: `${method} to ${endpoint} succeeded.` };
  } catch (error) {
    return { success: false, resultSummary: `GHL API error: ${error instanceof Error ? error.message : String(error)}` };
  }
}
