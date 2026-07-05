import { sql } from "drizzle-orm";
import { createDatabase, type AppDatabase } from "../db/client";
import {
  DrizzleCognitiveObjectRepository,
  InMemoryCognitiveObjectRepository,
  type CognitiveObjectRepository,
} from "./cognitive-object/repository";
import {
  DrizzleCognitiveGraphRepository,
  InMemoryCognitiveGraphRepository,
  type CognitiveGraphRepository,
} from "./cognitive-graph/repository";
import {
  DrizzleEvolutionLoopRunRepository,
  InMemoryEvolutionLoopRunRepository,
  type EvolutionLoopRunRepository,
} from "./evolution-loop/repository";
import {
  DrizzleOutcomeRepository,
  InMemoryOutcomeRepository,
  type OutcomeRepository,
} from "./outcome/repository";
import { GraphContextRetriever, type ContextRetriever } from "./ai/context-retriever";
import { reasoningEngine } from "./ai/engine";
import {
  FakeEmbeddingProvider,
  VoyageEmbeddingProvider,
  loadEmbeddingConfig,
  type EmbeddingProvider,
} from "./ai/embeddings";
import {
  DrizzleAgentRunRepository,
  InMemoryAgentRunRepository,
  type AgentRunRepository,
} from "./agents/agent-run/repository";
import {
  DrizzleProposedActionRepository,
  InMemoryProposedActionRepository,
  type ProposedActionRepository,
} from "./agents/proposed-action/repository";
import { createAgentEngine } from "./agents/engine";
import {
  DrizzleCredentialRepository,
  InMemoryCredentialRepository,
  type CredentialRepository,
} from "./integrations/credentials/repository";

// Central persistence wiring. When DATABASE_URL is set we use the Postgres /
// Drizzle adapters (shared single client); otherwise everything falls back to
// in-memory repositories so local dev, tests, and pre-database deploys keep
// working without a database.
interface Repositories {
  cognitiveObjectRepository: CognitiveObjectRepository;
  cognitiveGraphRepository: CognitiveGraphRepository;
  evolutionLoopRunRepository: EvolutionLoopRunRepository;
  outcomeRepository: OutcomeRepository;
  agentRunRepository: AgentRunRepository;
  proposedActionRepository: ProposedActionRepository;
  credentialRepository: CredentialRepository;
}

// In production, silently falling back to in-memory repositories on a
// misconfigured DATABASE_URL would look like a working deploy while quietly
// discarding every write on restart. Fail loud instead (AUDIT.md open item).
//
// NEXT_PHASE === "phase-production-build" excludes `next build`'s page-data
// collection step, which imports every route module (this one included)
// under NODE_ENV=production before the real runtime env is available. This
// guard must only fire when the server actually starts serving requests.
const isNextProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

if (process.env.NODE_ENV === "production" && !isNextProductionBuild && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required in production. Refusing to start on the in-memory fallback.",
  );
}

const database: AppDatabase | null = process.env.DATABASE_URL
  ? createDatabase(process.env.DATABASE_URL)
  : null;

function createRepositories(db: AppDatabase | null): Repositories {
  if (db) {
    return {
      cognitiveObjectRepository: new DrizzleCognitiveObjectRepository(db),
      cognitiveGraphRepository: new DrizzleCognitiveGraphRepository(db),
      evolutionLoopRunRepository: new DrizzleEvolutionLoopRunRepository(db),
      outcomeRepository: new DrizzleOutcomeRepository(db),
      agentRunRepository: new DrizzleAgentRunRepository(db),
      proposedActionRepository: new DrizzleProposedActionRepository(db),
      credentialRepository: new DrizzleCredentialRepository(db),
    };
  }

  return {
    cognitiveObjectRepository: new InMemoryCognitiveObjectRepository(),
    cognitiveGraphRepository: new InMemoryCognitiveGraphRepository(),
    evolutionLoopRunRepository: new InMemoryEvolutionLoopRunRepository(),
    outcomeRepository: new InMemoryOutcomeRepository(),
    agentRunRepository: new InMemoryAgentRunRepository(),
    proposedActionRepository: new InMemoryProposedActionRepository(),
    credentialRepository: new InMemoryCredentialRepository(),
  };
}

const repositories = createRepositories(database);

export interface PersistenceReadiness {
  mode: "postgres" | "in-memory";
  ok: boolean;
}

// Readiness probe helper: verifies the configured persistence layer can
// actually serve queries. In-memory mode is always ready by definition.
export async function checkPersistenceReady(timeoutMs = 2000): Promise<PersistenceReadiness> {
  if (!database) {
    return { mode: "in-memory", ok: true };
  }

  try {
    await Promise.race([
      database.execute(sql`select 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database readiness check timed out.")), timeoutMs),
      ),
    ]);
    return { mode: "postgres", ok: true };
  } catch {
    return { mode: "postgres", ok: false };
  }
}

export const cognitiveObjectRepository = repositories.cognitiveObjectRepository;
export const cognitiveGraphRepository = repositories.cognitiveGraphRepository;
export const evolutionLoopRunRepository = repositories.evolutionLoopRunRepository;
export const outcomeRepository = repositories.outcomeRepository;

// AI reasoning + context retrieval wiring. The reasoning engine itself picks
// real-vs-fake based on ANTHROPIC_API_KEY presence (see ai/engine.ts). The
// embedding provider picks real-vs-fake the same way, keyed off
// VOYAGE_API_KEY -- this is what keeps object creation and context retrieval
// keyless in dev/CI/tests (see ai/embeddings.ts).
const embeddingConfig = loadEmbeddingConfig();
export const embeddingProvider: EmbeddingProvider = embeddingConfig.apiKey
  ? new VoyageEmbeddingProvider(embeddingConfig.apiKey, embeddingConfig.model)
  : new FakeEmbeddingProvider();

export const contextRetriever: ContextRetriever = new GraphContextRetriever(
  cognitiveGraphRepository,
  cognitiveObjectRepository,
);
export { reasoningEngine };

// Phase 2: agent runs + governed Proposed Actions. agentEngine picks
// real-vs-fake the same way reasoningEngine does (see agents/engine.ts).
export const agentRunRepository = repositories.agentRunRepository;
export const proposedActionRepository = repositories.proposedActionRepository;

// Phase 2 PR3: per-tenant encrypted integration credentials (GHL, Resend).
export const credentialRepository = repositories.credentialRepository;

export const agentEngine = createAgentEngine(credentialRepository);
