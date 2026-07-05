import type { CognitiveGraphRepository } from "../../cognitive-graph/repository";
import { createCognitiveGraphEdge } from "../../cognitive-graph/service";
import type { CognitiveObjectRepository } from "../../cognitive-object/repository";
import type { CredentialRepository } from "../../integrations/credentials/repository";
import { getDecryptedCredential } from "../../integrations/credentials/service";
import { executeGhlWrite } from "../tools/ghl-tools";
import type { ProposedAction } from "./types";

export interface ActionExecutionResult {
  success: boolean;
  resultSummary: string;
}

export interface ActionExecutor {
  execute(action: ProposedAction): Promise<ActionExecutionResult>;
}

// Real executor: create_followup_object needs no external credentials --
// it's a write against infrastructure this product already has (Phase 2
// design, Decision 10 distinguishes this from the external tools below).
// Links the new object back to the one the agent run was working on with a
// "resulted_in" edge (Decision 4's spirit: every action is auditable and
// tied back to its origin).
export class CreateFollowupObjectExecutor implements ActionExecutor {
  constructor(
    private readonly objectRepository: CognitiveObjectRepository,
    private readonly graphRepository: CognitiveGraphRepository,
    private readonly agentName: string,
  ) {}

  async execute(action: ProposedAction): Promise<ActionExecutionResult> {
    const args = action.args as { title?: unknown; objectType?: unknown; summary?: unknown };
    const title = typeof args.title === "string" ? args.title : "Untitled follow-up";
    const objectType =
      typeof args.objectType === "string" && ["decision", "research", "issue", "proposal"].includes(args.objectType)
        ? (args.objectType as "decision" | "research" | "issue" | "proposal")
        : "issue";
    const summary = typeof args.summary === "string" ? args.summary : null;

    const created = await this.objectRepository.create({
      tenantId: action.tenantId,
      createdByUserId: `agent:${this.agentName}`,
      objectType,
      title,
      summary,
      source: "system",
      riskLevel: "low",
      tags: ["agent-created"],
    });

    // Uses the graph SERVICE (not the repository directly): it enforces
    // tenant isolation on both endpoints and blocks duplicate edges, checks
    // the repository alone doesn't do.
    await createCognitiveGraphEdge(this.graphRepository, this.objectRepository, {
      tenantId: action.tenantId,
      fromObjectId: action.objectId,
      toObjectId: created.id,
      relationshipType: "resulted_in",
      strength: 100,
      source: "system_rule",
      createdByAgentId: this.agentName,
    });

    return {
      success: true,
      resultSummary: `Created follow-up ${objectType} "${title}" (${created.id}).`,
    };
  }
}

// Fake executor: used whenever the tenant hasn't configured a Resend
// credential yet. Records the action as executed without making any real
// network call, so the governed-action flow (propose -> approve -> execute)
// stays fully testable without a live key, and a tenant that hasn't set up
// email yet still gets a clean audit trail instead of a crash.
export class FakeSendEmailExecutor implements ActionExecutor {
  async execute(action: ProposedAction): Promise<ActionExecutionResult> {
    const args = action.args as { to?: unknown; subject?: unknown };
    const to = typeof args.to === "string" ? args.to : "unknown recipient";
    const subject = typeof args.subject === "string" ? args.subject : "(no subject)";
    return {
      success: true,
      resultSummary: `[SIMULATED] Would send email to ${to}: "${subject}". No Resend credential configured for this tenant.`,
    };
  }
}

const RESEND_API_URL = "https://api.resend.com/emails";
// Sending from a custom, tenant-verified domain is a real Resend feature
// (domain verification) beyond this pass's scope -- every tenant currently
// sends from one shared address. Revisit if/when per-tenant sending domains
// are needed.
const RESEND_FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS ?? "notifications@donna.app";

// Real executor: sends via Resend using the tenant's own encrypted API key.
// Only reached after governance clears the action (send_email is irreversible
// + external, so per Decision 3 that always means "after human approval").
export class ResendSendEmailExecutor implements ActionExecutor {
  constructor(
    private readonly credentialRepository: CredentialRepository,
  ) {}

  async execute(action: ProposedAction): Promise<ActionExecutionResult> {
    const args = action.args as { to?: unknown; subject?: unknown; body?: unknown };
    const to = typeof args.to === "string" ? args.to : null;
    const subject = typeof args.subject === "string" ? args.subject : null;
    const body = typeof args.body === "string" ? args.body : null;
    if (!to || !subject || !body) {
      return { success: false, resultSummary: "Invalid email arguments (need to, subject, body)." };
    }

    const apiKey = await getDecryptedCredential(this.credentialRepository, action.tenantId, "resend");
    if (!apiKey) {
      return { success: false, resultSummary: "Resend is not configured for this tenant." };
    }

    const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${body.replace(/\n/g, "<br>")}</div>`;
    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: RESEND_FROM_ADDRESS, to: [to], subject, html, text: body }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, resultSummary: `Resend API error: HTTP ${response.status} -- ${errorBody.slice(0, 200)}` };
      }
      const result = (await response.json()) as { id?: string };
      return { success: true, resultSummary: `Email sent to ${to}: "${subject}" (id: ${result.id ?? "ok"}).` };
    } catch (error) {
      return { success: false, resultSummary: `Email send error: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

// Real executor: wraps the GHL write tool's own credential lookup + safety
// guardrails (blocked endpoints, hostname check -- see tools/ghl-tools.ts).
export class GhlWriteExecutor implements ActionExecutor {
  constructor(private readonly credentialRepository: CredentialRepository) {}

  async execute(action: ProposedAction): Promise<ActionExecutionResult> {
    const result = await executeGhlWrite(
      { tenantId: action.tenantId, credentialRepository: this.credentialRepository },
      action.args,
    );
    return result;
  }
}
