// Barrel file for drizzle-zero — named exports of all tables and relations.
// drizzle-zero requires a single TS file (not a folder) for type resolution.

// Tables (omit oauth* + jwks from auth/auth — server-only; not in Postgres replication publication)
export {
  user,
  session,
  account,
  verification,
  subscription,
} from "./auth/auth";
export { chats, messages, parts } from "./ai/chat";
export { institution } from "./banking/items/institution";

// SRI-264 unified schema
export { financialAccount } from "./accounts/financial-account";
export { balance } from "./accounts/balance";
export { snapshot } from "./accounts/snapshot";
export { security } from "./investments/security";
export { holding } from "./investments/holding";
export { orders } from "./investments/order";
export { transaction } from "./accounts/transaction";
export { recurringStream } from "./accounts/recurring-stream";
export { investmentActivity } from "./investments/investment-activity";
export {
  creditLiability,
  mortgageLiability,
  studentLoanLiability,
} from "./accounts/liabilities";
export { plaidConnection } from "./providers/plaid/connection";
export { snaptradeAuthorization } from "./providers/snaptrade/authorization";
export { snaptradeUser } from "./providers/snaptrade/user";

export { feedback } from "./features/feedback";
export { financialEvents, eventArticles } from "./features/financial-events";
export { financialGoals } from "./features/financial-goals";
export { kalshiUsers } from "./features/kalshi";
export { messageVotes } from "./features/message-votes";
export { rssArticles, rssFeeds } from "./features/rss";
export { userAlerts } from "./features/user-alerts";
export { mobileSubscription } from "./mobile/subscriptions";

// Legacy v1 `relations()` exports for drizzle-zero code generation only.
// Runtime DB uses Relational Queries v2 from `./relations`.
export {
  userRelations,
  accountRelations,
  sessionRelations,
  subscriptionRelations,
  chatsRelations,
  messagesRelations,
  partsRelations,
  financialAccountRelations,
  balanceRelations,
  snapshotRelations,
  securityRelations,
  holdingRelations,
  ordersRelations,
  transactionRelations,
  recurringStreamRelations,
  investmentActivityRelations,
  creditLiabilityRelations,
  mortgageLiabilityRelations,
  studentLoanLiabilityRelations,
  plaidConnectionRelations,
  snaptradeAuthorizationRelations,
  snaptradeUserRelations,
  institutionRelations,
  financialEventsRelations,
  eventArticlesRelations,
  userAlertsRelations,
  financialGoalsRelations,
  mobileSubscriptionRelations,
  kalshiUserRelations,
  feedbackRelations,
  messageVotesRelations,
} from "./relations-drizzle-zero";
