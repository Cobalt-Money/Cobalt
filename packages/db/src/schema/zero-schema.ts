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

// SRI-349 — social layer tables synced to Zero (read by friends app).
//
// Invite tables (`socialInvite`, `socialInviteRedemption`) are READ via Zero
// (realtime inbox + sent-list) but MUTATED via Hono routes in the invite
// plugin — atomic uses_count increment + redemption ledger writes belong on
// the server. Token entry into Zero state is safe because permissions
// scope rows by inviter / target.
//
// merchantGeocodeCache, place, enrichmentEvent stay server-only.
// transaction.placeId is a plain FK column kept on transaction rows; client
// reads the denormalized brand/location columns the enrichment pipeline
// writes onto transaction directly, never joins back to `place`. Excluding
// these from drizzle-zero exports keeps them out of the publication and out
// of the Railway zero-cache SQLite replica (SRI-244 follow-up).
export { socialFriendship } from "./social/friendship";
export { socialInvite, socialInviteRedemption } from "./social/invite";
export { socialPost } from "./social/post";
export { socialShareSettings } from "./social/share-settings";
export { socialMerchantBlocklist } from "./social/merchant-blocklist";
export { socialCategoryBlocklist } from "./social/category-blocklist";

// v2 `defineRelations` for drizzle-zero@1.0-beta. Same source as DB runtime.
export { relations } from "./relations";
