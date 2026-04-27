import { env } from "@cobalt-web/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as deprecatedSchema from "./schema/_deprecated";
import * as financialAccountSchema from "./schema/accounts/account";
import * as balanceSchema from "./schema/accounts/balance";
import * as creditLiabilitySchema from "./schema/accounts/banking/liabilities/credit";
import * as mortgageLiabilitySchema from "./schema/accounts/banking/liabilities/mortgage";
import * as studentLoanLiabilitySchema from "./schema/accounts/banking/liabilities/student-loan";
import * as recurringSchema from "./schema/accounts/banking/transactions/recurring";
import * as transactionSchema from "./schema/accounts/banking/transactions/transaction";
import * as holdingSchema from "./schema/accounts/investments/holding";
import * as investmentActivitySchema from "./schema/accounts/investments/investment-activity";
import * as orderSchema from "./schema/accounts/investments/order";
import * as securitySchema from "./schema/accounts/investments/security";
import * as kalshiSchema from "./schema/accounts/prediction-markets/kalshi";
import * as snapshotSchema from "./schema/accounts/snapshot";
import * as chatSchema from "./schema/ai/chat";
import * as messageVotesSchema from "./schema/ai/message-votes";
import * as financialGoalsSchema from "./schema/goals/financial-goals";
import * as financialEventsSchema from "./schema/news/financial-events";
import * as rssSchema from "./schema/news/rss";
import * as plaidConnectionSchema from "./schema/providers/plaid/connection";
import * as institutionSchema from "./schema/providers/plaid/institution";
import * as snaptradeAuthorizationSchema from "./schema/providers/snaptrade/authorization";
import * as snaptradeUserSchema from "./schema/providers/snaptrade/user";
import { relations } from "./schema/relations";
import * as userAlertsSchema from "./schema/users/alerts";
import * as authSchema from "./schema/users/auth/auth";
import * as feedbackSchema from "./schema/users/feedback";
import * as mobileSubscriptionsSchema from "./schema/users/subscriptions/mobile";
import * as stripeSubscriptionsSchema from "./schema/users/subscriptions/stripe";

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
