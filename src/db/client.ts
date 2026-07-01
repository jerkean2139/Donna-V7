import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

export function createDatabase(databaseUrl = process.env.DATABASE_URL): AppDatabase {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create the Drizzle database client.");
  }

  const client = postgres(databaseUrl);
  return drizzle(client, { schema });
}
