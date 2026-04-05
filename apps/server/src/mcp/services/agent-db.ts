import { env } from "@cobalt-web/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Dedicated database connection for AI agent queries.
 * Uses AGENT_DATABASE_URL (a separate connection URI for the agent_readonly role)
 * and falls back to DATABASE_URL for local development.
 *
 * The agent role has SELECT-only permissions. RLS scopes rows to the current user
 * via `SET LOCAL request.jwt.claims` inside a transaction before queries.
 */
const globalForAgentDb = globalThis as unknown as {
  agentPool: Pool | undefined;
};

const agentPool =
  globalForAgentDb.agentPool ??
  new Pool({
    connectionString: env.AGENT_DATABASE_URL ?? env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: env.NODE_ENV === "production" ? 0 : 30_000,
    max: env.AGENT_DB_POOL_MAX,
  });

if (env.NODE_ENV !== "production") {
  globalForAgentDb.agentPool = agentPool;
}

export const agentDb = drizzle({ client: agentPool });
