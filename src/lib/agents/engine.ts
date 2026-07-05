import { loadAiConfig } from "../ai/config";
import { AnthropicAgentEngine } from "./anthropic-engine";
import { FakeAgentEngine } from "./fake-engine";
import type { AgentEngine } from "./types";

// Same real-vs-fake selection as ai/engine.ts: real engine when
// ANTHROPIC_API_KEY is configured, deterministic fake engine otherwise.
function createAgentEngine(): AgentEngine {
  const config = loadAiConfig();
  return config.apiKey ? new AnthropicAgentEngine(config) : new FakeAgentEngine();
}

export const agentEngine: AgentEngine = createAgentEngine();
