// Barrel file for drizzle-zero — named exports of all tables and relations.
// drizzle-zero requires a single TS file (not a folder) for type resolution.

// Tables (omit oauth* + jwks from auth/auth — server-only; not in Postgres replication publication)
export { account, session, user, verification } from "./auth/auth";
export { chats, messages, parts } from "./ai/chat";
export { messageVotes } from "./ai/message-votes";
export { financialAccount } from "./banking/financial-account";
export { balance } from "./banking/balances/balance";
export { snapshot } from "./banking/balances/snapshot";
export { security } from "./banking/investments/security";
export { holding } from "./banking/investments/holding";
export { orders } from "./banking/investments/order";
export { investmentActivity } from "./banking/investments/investment-activity";
export { creditLiability } from "./banking/liabilities/credit";
export { mortgageLiability } from "./banking/liabilities/mortgage";
export { studentLoanLiability } from "./banking/liabilities/student-loan";
export { transaction } from "./banking/transactions/transaction";
export { recurring } from "./banking/transactions/recurring";
export { feedback } from "./features/feedback";
export { financialGoals } from "./features/financial-goals";
export { kalshiUsers } from "./features/kalshi";
export { userAlerts } from "./features/user-alerts";
export { eventArticles, financialEvents } from "./news/financial-events";
export { rssArticles, rssFeeds } from "./news/rss";
export { plaidConnection } from "./providers/plaid/connection";
export { institution } from "./providers/plaid/institution";
export { snaptradeAuthorization } from "./providers/snaptrade/authorization";
export { snaptradeUser } from "./providers/snaptrade/user";
export { mobileSubscription } from "./subscriptions/mobile";
export { subscription } from "./subscriptions/stripe";

// Legacy v1 `relations()` exports for drizzle-zero code generation only.
// Runtime DB uses Relational Queries v2 from `./relations`.
export {
  accountRelations,
  balanceRelations,
  chatsRelations,
  creditLiabilityRelations,
  eventArticlesRelations,
  feedbackRelations,
  financialAccountRelations,
  financialEventsRelations,
  financialGoalsRelations,
  holdingRelations,
  institutionRelations,
  investmentActivityRelations,
  kalshiUserRelations,
  messageVotesRelations,
  messagesRelations,
  mobileSubscriptionRelations,
  mortgageLiabilityRelations,
  ordersRelations,
  partsRelations,
  plaidConnectionRelations,
  recurringStreamRelations,
  securityRelations,
  sessionRelations,
  snapshotRelations,
  snaptradeAuthorizationRelations,
  snaptradeUserRelations,
  studentLoanLiabilityRelations,
  subscriptionRelations,
  transactionRelations,
  userAlertsRelations,
  userRelations,
} from "./relations-drizzle-zero";
