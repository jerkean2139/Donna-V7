import type Anthropic from "@anthropic-ai/sdk";
import { extractToolInput } from "../src/lib/ai/anthropic-engine";
import { reasoningOutputSchema } from "../src/lib/ai/schema";

// These tests run without ANTHROPIC_API_KEY and never touch the network:
// they validate extractToolInput's own parsing/error behavior against
// hand-constructed message shapes, not a live API response. Constructing the
// AnthropicReasoningEngine itself requires a key (by design; see
// engine.ts's real-vs-fake selection) and is exercised in a live/manual
// check, not CI.
function messageWithToolUse(name: string, input: unknown): Anthropic.Message {
  return {
    content: [{ type: "tool_use", id: "tool_1", name, input }],
  } as unknown as Anthropic.Message;
}

function messageWithNoToolUse(): Anthropic.Message {
  return { content: [{ type: "text", text: "no tool call here" }] } as unknown as Anthropic.Message;
}

const validReasoningOutput = {
  intentSummary: "This intent summary is long enough to pass validation.",
  contextSummary: "This context summary is also long enough to pass validation.",
  assumptions: [{ text: "An assumption.", riskLevel: "low", needsVerification: false, sourceObjectIds: [] }],
  optionsConsidered: [
    { name: "Option A", summary: "Summary A", tradeoffs: ["Tradeoff A"] },
    { name: "Option B", summary: "Summary B", tradeoffs: ["Tradeoff B"] },
  ],
  critique: [{ lens: "operator", concern: "A concern." }],
  risks: [{ riskLevel: "low", summary: "A risk.", mitigation: "A mitigation.", sourceObjectIds: [] }],
  recommendation: "This recommendation is long enough to pass validation too.",
  suggestedConfidence: 80,
  confidenceRationale: "This rationale is long enough to pass validation as well.",
};

describe("extractToolInput", () => {
  it("parses a well-formed tool_use block against the target schema", () => {
    const message = messageWithToolUse("reason_about_object", validReasoningOutput);
    const parsed = extractToolInput(message, "reason_about_object", reasoningOutputSchema);
    expect(parsed.suggestedConfidence).toBe(80);
  });

  it("throws a DomainError when no matching tool_use block is present", () => {
    expect(() => extractToolInput(messageWithNoToolUse(), "reason_about_object", reasoningOutputSchema)).toThrow(
      /did not include the expected/,
    );
  });

  it("throws a DomainError when the tool_use input fails schema validation", () => {
    const message = messageWithToolUse("reason_about_object", { ...validReasoningOutput, suggestedConfidence: 200 });
    expect(() => extractToolInput(message, "reason_about_object", reasoningOutputSchema)).toThrow(
      /did not match the expected schema/,
    );
  });

  it("ignores a tool_use block for a different tool name", () => {
    const message = messageWithToolUse("some_other_tool", validReasoningOutput);
    expect(() => extractToolInput(message, "reason_about_object", reasoningOutputSchema)).toThrow(
      /did not include the expected/,
    );
  });
});

describe("hand-written Anthropic tool schema stays in sync with the Zod schema", () => {
  it("every required Zod field for ReasoningOutput is a top-level object key", () => {
    const shape = reasoningOutputSchema.shape;
    const requiredKeys = Object.keys(shape);

    // A regression here means anthropic-engine.ts's reasoningToolInputSchema
    // (hand-written JSON schema) and ai/schema.ts's reasoningOutputSchema
    // (Zod, used to VALIDATE the model's output) have drifted: every field
    // the Zod schema expects must also be something the tool schema asks the
    // model for, or validation will always fail in production.
    expect(requiredKeys.sort()).toEqual(
      [
        "intentSummary",
        "contextSummary",
        "assumptions",
        "optionsConsidered",
        "critique",
        "risks",
        "recommendation",
        "suggestedConfidence",
        "confidenceRationale",
      ].sort(),
    );
  });
});
