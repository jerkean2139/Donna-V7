import { loadAiConfig } from "../ai/config";
import type { CredentialRepository } from "../integrations/credentials/repository";
import { AnthropicAgentEngine } from "./anthropic-engine";
import { FakeAgentEngine } from "./fake-engine";
import type { AgentEngine } from "./types";

// A factory, not a module-level singleton like ai/engine.ts's
// reasoningEngine: the real engine needs the already-constructed
// credentialRepository (for GHL reads), and repositories.ts is the one
// place that already owns the DB-vs-in-memory selection for every
// repository -- constructing a second one here would mean a second
// Postgres connection pool. Called once from repositories.ts.
export function createAgentEngine(credentialRepository: CredentialRepository): AgentEngine {
  const config = loadAiConfig();
  return config.apiKey ? new AnthropicAgentEngine(config, credentialRepository) : new FakeAgentEngine();
}
