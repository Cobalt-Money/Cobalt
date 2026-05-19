// Barrel file for drizzle-zero — named exports of all tables and relations.
// drizzle-zero requires a single TS file (not a folder) for type resolution.

// Tables (omit oauth* + jwks from auth/auth — server-only; not in Postgres replication publication)
export { account, session, user, verification } from "./users/auth/auth";
export { chats, messages, parts } from "./ai/chat";
export { messageVotes } from "./ai/message-votes";
export { financialAccount } from "./accounts/account";
export { balance } from "./accounts/balance";
export { snapshot } from "./accounts/snapshot";
export { security } from "./accounts/investments/security";
export { holding } from "./accounts/investments/holding";
export { orders } from "./accounts/investments/order";
export { investmentActivity } from "./accounts/investments/investment-activity";
export { creditLiability } from "./accounts/banking/liabilities/credit";
export { mortgageLiability } from "./accounts/banking/liabilities/mortgage";
export { studentLoanLiability } from "./accounts/banking/liabilities/student-loan";
export { category } from "./accounts/banking/categories/category";
export { categoryGroup } from "./accounts/banking/categories/category-group";
export { transaction } from "./accounts/banking/transactions/transaction";
export { transactionEdit } from "./accounts/banking/transactions/transaction-edit";
export { recurring } from "./accounts/banking/transactions/recurring";
export { tag } from "./accounts/banking/tags/tag";
export { transactionTag } from "./accounts/banking/tags/transaction-tag";
export { feedback } from "./users/feedback";
export { financialGoals } from "./goals/financial-goals";
export { kalshiUsers } from "./accounts/prediction-markets/kalshi";
export { userAlerts } from "./users/alerts";
export { eventArticles, financialEvents } from "./news/financial-events";
export { rssArticles, rssFeeds } from "./news/rss";
export { plaidConnection } from "./providers/plaid/connection";
export { institution } from "./providers/plaid/institution";
export { snaptradeAuthorization } from "./providers/snaptrade/authorization";
export { snaptradeUser } from "./providers/snaptrade/user";
export { mobileSubscription } from "./users/subscriptions/mobile";
export { subscription } from "./users/subscriptions/stripe";
export { fundamentals } from "./research/fundamentals";
export { tickers } from "./research/tickers";

// Imports — transaction.import_job_id FK forces importJob (and its peers)
// to be in the schema graph drizzle-zero traverses, even though Zero won't
// sync the rows themselves to the client.
export { accountMappingCache } from "./imports/account-mapping-cache";
export { categoryMappingCache } from "./imports/category-mapping-cache";
export { csvColumnRoleCache } from "./imports/csv-column-role-cache";
export { csvMappingCache } from "./imports/csv-mapping-cache";
export { importJob } from "./imports/import-job";
export { importStagedTransaction } from "./imports/import-staged-transaction";

// v2 `defineRelations` for drizzle-zero@1.0-beta. Same source as DB runtime.
export { relations } from "./relations";
