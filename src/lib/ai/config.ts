import type { RiskLevel } from "../cognitive-object/types";

// Model IDs are env-driven, never hardcoded — KOB v2's mistake was baking
// specific model strings into multiple files, which silently rot as models
// are deprecated. Defaults are sane fallbacks for local dev only.
export interface AiConfig {
  apiKey: string | undefined;
  defaultModel: string;
  escalatedModel: string;
  judgeModel: string;
  maxOutputTokens: number;
  timeoutMs: number;
}

export function loadAiConfig(): AiConfig {
  return {
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.ANTHROPIC_MODEL_DEFAULT ?? "claude-sonnet-4-5",
    escalatedModel: process.env.ANTHROPIC_MODEL_ESCALATED ?? "claude-opus-4-1",
    judgeModel: process.env.ANTHROPIC_MODEL_JUDGE ?? "claude-opus-4-1",
    maxOutputTokens: Number(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS ?? 4096),
    timeoutMs: Number(process.env.ANTHROPIC_TIMEOUT_MS ?? 30_000),
  };
}

// Escalate to the stronger model for the decisions that most need to be
// right. Everything else (low/medium risk) uses the cheaper default.
export function selectReasoningModel(config: AiConfig, riskLevel: RiskLevel): string {
  return riskLevel === "high" || riskLevel === "critical"
    ? config.escalatedModel
    : config.defaultModel;
}
