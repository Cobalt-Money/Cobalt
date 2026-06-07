import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { merchantLocation } from "../../../../src/schema/merchants/merchant-location";
import { merchant } from "../../../../src/schema/merchants/merchant";

const url =
  process.env.MERCHANT_IMPORT_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5433/cobalt";

export const pool = new Pool({ connectionString: url, max: 5 });
export const db = drizzle({ client: pool });
export { merchant, merchantLocation };
