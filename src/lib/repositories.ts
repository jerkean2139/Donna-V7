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

// Central persistence wiring. When DATABASE_URL is set we use the Postgres /
// Drizzle adapters (shared single client); otherwise everything falls back to
// in-memory repositories so local dev, tests, and pre-database deploys keep
// working without a database.
interface Repositories {
  cognitiveObjectRepository: CognitiveObjectRepository;
  cognitiveGraphRepository: CognitiveGraphRepository;
  evolutionLoopRunRepository: EvolutionLoopRunRepository;
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
    };
  }

  return {
    cognitiveObjectRepository: new InMemoryCognitiveObjectRepository(),
    cognitiveGraphRepository: new InMemoryCognitiveGraphRepository(),
    evolutionLoopRunRepository: new InMemoryEvolutionLoopRunRepository(),
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
