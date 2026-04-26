import { env } from "@cobalt-web/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as deprecatedSchema from "./schema/_deprecated";
import * as chatSchema from "./schema/ai/chat";
import * as authSchema from "./schema/auth/auth";
import * as bankingSchema from "./schema/banking";
import * as feedbackSchema from "./schema/features/feedback";
import * as financialEventsSchema from "./schema/features/financial-events";
import * as financialGoalsSchema from "./schema/features/financial-goals";
import * as kalshiSchema from "./schema/features/kalshi";
import * as messageVotesSchema from "./schema/features/message-votes";
import * as rssSchema from "./schema/features/rss";
import * as userAlertsSchema from "./schema/features/user-alerts";
import * as mobileSchema from "./schema/mobile/subscriptions";
import { relations } from "./schema/relations";

const pool = new Pool({
  connectionString: env.LOCAL_DATABASE_URL ?? env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
});

export const db = drizzle({
  client: pool,
  relations,
  schema: {
    ...authSchema,
    ...chatSchema,
    ...bankingSchema,
    ...deprecatedSchema,
    ...feedbackSchema,
    ...financialEventsSchema,
    ...financialGoalsSchema,
    ...kalshiSchema,
    ...messageVotesSchema,
    ...rssSchema,
    ...userAlertsSchema,
    ...mobileSchema,
  },
});
