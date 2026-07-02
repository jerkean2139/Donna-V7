import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

export function createDatabase(databaseUrl = process.env.DATABASE_URL): AppDatabase {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create the Drizzle database client.");
  }

  // Bounded pool with idle/connect timeouts so a burst of server renders
  // cannot exhaust Postgres connections and dead connections get recycled.
  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}
