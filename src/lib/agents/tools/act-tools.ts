import { z } from "zod";
import type { RiskLevel } from "../../cognitive-object/types";

// Act tools never execute inline (see types.ts's ToolKind doc comment).
// Calling one only produces a ProposedActionDraft: validated args, a
// human-readable description, and a fixed risk/reversibility rating the
// MODEL never controls (Phase 2 design, Decision 7 -- the model can't be
// trusted to rate the danger of its own action).
export interface ActToolSpec {
  name: string;
  description: string;
  kind: "act";
  riskLevel: RiskLevel;
  reversible: boolean;
  inputSchema: z.ZodType<Record<string, unknown>>;
  describeAction(args: Record<string, unknown>): string;
}

const createFollowupObjectInputSchema = z.object({
  title: z.string().min(3).max(180),
  objectType: z.enum(["decision", "research", "issue", "proposal"]),
  summary: z.string().max(1000).optional(),
});

// V7-native: creates a new Cognitive Object linked back to the one this
// agent run was working on. No external credentials needed, so unlike
// send_email below, this tool gets a REAL executor once approved/cleared
// (see proposed-action/executors.ts) -- it's just a database write against
// infrastructure this product already has.
export const createFollowupObjectTool: ActToolSpec = {
  name: "create_followup_object",
  description:
    "Create a follow-up Cognitive Object (a task, question, or issue) linked to the current object. " +
    "Input: title, objectType (decision|research|issue|proposal), and an optional summary.",
  kind: "act",
  riskLevel: "low",
  reversible: true, // a Cognitive Object can be archived; this is not destructive
  inputSchema: createFollowupObjectInputSchema,
  describeAction(rawArgs) {
    const { title, objectType } = createFollowupObjectInputSchema.parse(rawArgs);
    return `Create a follow-up ${objectType}: "${title}"`;
  },
};

const sendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

// External and irreversible once sent -- per Decision 3, this NEVER
// auto-executes in Phase 2 regardless of confidence. It also has no real
// executor yet: sending real email needs per-tenant credentials (Decision 9),
// which is explicitly deferred to PR3. Until then, an approved send_email
// action is executed by a FakeActionExecutor that records the action as
// completed without making a real network call.
export const sendEmailTool: ActToolSpec = {
  name: "send_email",
  description: "Draft and send an email. Input: to, subject, body. Always requires human approval.",
  kind: "act",
  riskLevel: "medium",
  reversible: false,
  inputSchema: sendEmailInputSchema,
  describeAction(rawArgs) {
    const { to, subject } = sendEmailInputSchema.parse(rawArgs);
    return `Send an email to ${to}: "${subject}"`;
  },
};

export const ACT_TOOLS: Record<string, ActToolSpec> = {
  create_followup_object: createFollowupObjectTool,
  send_email: sendEmailTool,
};
