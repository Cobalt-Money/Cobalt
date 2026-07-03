import { env } from "@cobalt-web/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "./schema/relations";

const pool = new Pool({
  connectionString: env.LOCAL_DATABASE_URL ?? env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
});

export const db = drizzle({
  client: pool,
  relations,
});
