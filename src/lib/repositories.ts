import { createDatabase } from "../db/client";
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

// Central persistence wiring. When DATABASE_URL is set we use the Postgres /
// Drizzle adapters (shared single client); otherwise everything falls back to
// in-memory repositories so local dev, tests, and pre-database deploys keep
// working without a database.
interface Repositories {
  cognitiveObjectRepository: CognitiveObjectRepository;
  cognitiveGraphRepository: CognitiveGraphRepository;
  evolutionLoopRunRepository: EvolutionLoopRunRepository;
  outcomeRepository: OutcomeRepository;
}

function createRepositories(): Repositories {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const db = createDatabase(databaseUrl);
    return {
      cognitiveObjectRepository: new DrizzleCognitiveObjectRepository(db),
      cognitiveGraphRepository: new DrizzleCognitiveGraphRepository(db),
      evolutionLoopRunRepository: new DrizzleEvolutionLoopRunRepository(db),
      outcomeRepository: new DrizzleOutcomeRepository(db),
    };
  }

  return {
    cognitiveObjectRepository: new InMemoryCognitiveObjectRepository(),
    cognitiveGraphRepository: new InMemoryCognitiveGraphRepository(),
    evolutionLoopRunRepository: new InMemoryEvolutionLoopRunRepository(),
    outcomeRepository: new InMemoryOutcomeRepository(),
  };
}

const repositories = createRepositories();

export const cognitiveObjectRepository = repositories.cognitiveObjectRepository;
export const cognitiveGraphRepository = repositories.cognitiveGraphRepository;
export const evolutionLoopRunRepository = repositories.evolutionLoopRunRepository;
export const outcomeRepository = repositories.outcomeRepository;
