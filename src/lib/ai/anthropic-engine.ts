import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { logger, errorField } from "../logger";
import { DomainError } from "../errors";
import type { AiConfig } from "./config";
import { selectReasoningModel } from "./config";
import { buildJudgeSystemPrompt, buildJudgeUserContent } from "./prompts/judge";
import { buildReasoningSystemPrompt, buildReasoningUserContent } from "./prompts/reasoning";
import { judgeOutputSchema, reasoningOutputSchema } from "./schema";
import type { JudgeInput, JudgeOutput, ReasoningEngine, ReasoningInput, ReasoningOutput } from "./types";

const REASON_TOOL_NAME = "reason_about_object";
const JUDGE_TOOL_NAME = "score_decision_quality";

// zodToJsonSchema is intentionally avoided as a new dependency; the tool
// schemas below are hand-written and kept in lockstep with ai/schema.ts by
// the two schema-conformance tests in tests/ai.anthropic-engine.test.ts.
const reasoningToolInputSchema = {
  type: "object" as const,
  properties: {
    intentSummary: { type: "string" },
    contextSummary: { type: "string" },
    assumptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
          needsVerification: { type: "boolean" },
          sourceObjectIds: { type: "array", items: { type: "string" } },
        },
        required: ["text", "riskLevel", "needsVerification", "sourceObjectIds"],
      },
    },
    optionsConsidered: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          tradeoffs: { type: "array", items: { type: "string" } },
        },
        required: ["name", "summary", "tradeoffs"],
      },
    },
    critique: {
      type: "array",
      items: {
        type: "object",
        properties: {
          lens: { type: "string" },
          concern: { type: "string" },
        },
        required: ["lens", "concern"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
          summary: { type: "string" },
          mitigation: { type: "string" },
          sourceObjectIds: { type: "array", items: { type: "string" } },
        },
        required: ["riskLevel", "summary", "mitigation", "sourceObjectIds"],
      },
    },
    recommendation: { type: "string" },
    suggestedConfidence: { type: "integer" },
    confidenceRationale: { type: "string" },
  },
  required: [
    "intentSummary",
    "contextSummary",
    "assumptions",
    "optionsConsidered",
    "critique",
    "risks",
    "recommendation",
    "suggestedConfidence",
    "confidenceRationale",
  ],
};

const judgeToolInputSchema = {
  type: "object" as const,
  properties: {
    categoryScores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          categoryId: { type: "string" },
          score: { type: "integer" },
          rationale: { type: "string" },
        },
        required: ["categoryId", "score", "rationale"],
      },
    },
    overallNotes: { type: "string" },
  },
  required: ["categoryScores", "overallNotes"],
};

export class AnthropicReasoningEngine implements ReasoningEngine {
  private readonly client: Anthropic;

  constructor(private readonly config: AiConfig) {
    if (!config.apiKey) {
      throw new DomainError("ANTHROPIC_API_KEY is required to construct AnthropicReasoningEngine.");
    }
    this.client = new Anthropic({ apiKey: config.apiKey, timeout: config.timeoutMs });
  }

  async reasonAboutObject(input: ReasoningInput): Promise<ReasoningOutput> {
    const model = selectReasoningModel(this.config, input.object.riskLevel);
    const startedAt = Date.now();

    const message = await this.client.messages.create({
      model,
      max_tokens: this.config.maxOutputTokens,
      system: buildReasoningSystemPrompt(),
      messages: [{ role: "user", content: buildReasoningUserContent(input) }],
      tools: [
        {
          name: REASON_TOOL_NAME,
          description: "Report structured reasoning about a Cognitive Object.",
          input_schema: reasoningToolInputSchema,
        },
      ],
      tool_choice: { type: "tool", name: REASON_TOOL_NAME },
    });

    const parsed = extractToolInput(message, REASON_TOOL_NAME, reasoningOutputSchema);

    logger.info("ai.reasoning.completed", {
      objectId: input.object.id,
      model,
      riskLevel: input.object.riskLevel,
      contextItemCount: input.context.length,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      durationMs: Date.now() - startedAt,
    });

    return parsed;
  }

  async scoreDecisionQuality(input: JudgeInput): Promise<JudgeOutput> {
    const model = this.config.judgeModel;
    const startedAt = Date.now();

    const message = await this.client.messages.create({
      model,
      max_tokens: this.config.maxOutputTokens,
      system: buildJudgeSystemPrompt(),
      messages: [{ role: "user", content: buildJudgeUserContent(input) }],
      tools: [
        {
          name: JUDGE_TOOL_NAME,
          description: "Report category scores grading a completed reasoning run.",
          input_schema: judgeToolInputSchema,
        },
      ],
      tool_choice: { type: "tool", name: JUDGE_TOOL_NAME },
    });

    const parsed = extractToolInput(message, JUDGE_TOOL_NAME, judgeOutputSchema);

    logger.info("ai.judge.completed", {
      objectId: input.object.title,
      model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      durationMs: Date.now() - startedAt,
    });

    return parsed;
  }
}

export function extractToolInput<T>(
  message: Anthropic.Message,
  toolName: string,
  schema: z.ZodType<T>,
): T {
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === toolName,
  );

  if (!toolUse) {
    throw new DomainError(`AI response did not include the expected ${toolName} tool call.`);
  }

  const result = schema.safeParse(toolUse.input);

  if (!result.success) {
    logger.error("ai.tool_output.schema_mismatch", {
      toolName,
      error: errorField(result.error),
    });
    throw new DomainError(`AI response for ${toolName} did not match the expected schema.`);
  }

  return result.data;
}
