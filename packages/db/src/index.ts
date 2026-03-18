import { env } from "@cobalt-web/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as chatSchema from "./schema/ai/chat";
import * as authSchema from "./schema/auth/auth";
import * as bankingSchema from "./schema/banking";
import * as brokerageSchema from "./schema/brokerage";
import * as feedbackSchema from "./schema/features/feedback";
import * as financialEventsSchema from "./schema/features/financial-events";
import * as financialGoalsSchema from "./schema/features/financial-goals";
import * as kalshiSchema from "./schema/features/kalshi";
import * as messageVotesSchema from "./schema/features/message-votes";
import * as rssSchema from "./schema/features/rss";
import * as userAlertsSchema from "./schema/features/user-alerts";
import * as mobileSchema from "./schema/mobile/subscriptions";
import * as relations from "./schema/relations";

export const db = drizzle(env.DATABASE_URL, {
  schema: {
    ...authSchema,
    ...chatSchema,
    ...bankingSchema,
    ...brokerageSchema,
    ...feedbackSchema,
    ...financialEventsSchema,
    ...financialGoalsSchema,
    ...kalshiSchema,
    ...messageVotesSchema,
    ...rssSchema,
    ...userAlertsSchema,
    ...mobileSchema,
    ...relations,
  },
});
