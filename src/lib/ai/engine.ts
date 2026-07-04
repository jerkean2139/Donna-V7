import { AnthropicReasoningEngine } from "./anthropic-engine";
import { loadAiConfig } from "./config";
import { FakeReasoningEngine } from "./fake-engine";
import type { ReasoningEngine } from "./types";

// Mirrors the DATABASE_URL-presence pattern in repositories.ts: real engine
// when a key is configured, deterministic fake engine otherwise. This keeps
// local dev, CI, and the entire existing test suite working with zero
// external dependencies and zero cost.
function createReasoningEngine(): ReasoningEngine {
  const config = loadAiConfig();
  return config.apiKey ? new AnthropicReasoningEngine(config) : new FakeReasoningEngine();
}

export const reasoningEngine: ReasoningEngine = createReasoningEngine();
