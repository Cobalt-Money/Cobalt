import { env } from "@cobalt-web/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as deprecatedSchema from "./schema/_deprecated";
import * as chatSchema from "./schema/ai/chat";
import * as messageVotesSchema from "./schema/ai/message-votes";
import * as authSchema from "./schema/auth/auth";
import * as balanceSchema from "./schema/banking/balances/balance";
import * as snapshotSchema from "./schema/banking/balances/snapshot";
import * as financialAccountSchema from "./schema/banking/financial-account";
import * as holdingSchema from "./schema/banking/investments/holding";
import * as investmentActivitySchema from "./schema/banking/investments/investment-activity";
import * as orderSchema from "./schema/banking/investments/order";
import * as securitySchema from "./schema/banking/investments/security";
import * as creditLiabilitySchema from "./schema/banking/liabilities/credit";
import * as mortgageLiabilitySchema from "./schema/banking/liabilities/mortgage";
import * as studentLoanLiabilitySchema from "./schema/banking/liabilities/student-loan";
import * as recurringSchema from "./schema/banking/transactions/recurring";
import * as transactionSchema from "./schema/banking/transactions/transaction";
import * as feedbackSchema from "./schema/features/feedback";
import * as financialGoalsSchema from "./schema/features/financial-goals";
import * as kalshiSchema from "./schema/features/kalshi";
import * as userAlertsSchema from "./schema/features/user-alerts";
import * as financialEventsSchema from "./schema/news/financial-events";
import * as rssSchema from "./schema/news/rss";
import * as plaidConnectionSchema from "./schema/providers/plaid/connection";
import * as institutionSchema from "./schema/providers/plaid/institution";
import * as snaptradeAuthorizationSchema from "./schema/providers/snaptrade/authorization";
import * as snaptradeUserSchema from "./schema/providers/snaptrade/user";
import { relations } from "./schema/relations";
import * as mobileSubscriptionsSchema from "./schema/subscriptions/mobile";
import * as stripeSubscriptionsSchema from "./schema/subscriptions/stripe";

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
    ...messageVotesSchema,
    ...financialAccountSchema,
    ...balanceSchema,
    ...snapshotSchema,
    ...transactionSchema,
    ...recurringSchema,
    ...creditLiabilitySchema,
    ...mortgageLiabilitySchema,
    ...studentLoanLiabilitySchema,
    ...securitySchema,
    ...holdingSchema,
    ...orderSchema,
    ...investmentActivitySchema,
    ...institutionSchema,
    ...plaidConnectionSchema,
    ...snaptradeAuthorizationSchema,
    ...snaptradeUserSchema,
    ...deprecatedSchema,
    ...feedbackSchema,
    ...financialEventsSchema,
    ...financialGoalsSchema,
    ...kalshiSchema,
    ...rssSchema,
    ...userAlertsSchema,
    ...mobileSubscriptionsSchema,
    ...stripeSubscriptionsSchema,
  },
});
