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
export { transaction } from "./accounts/banking/transactions/transaction";
export { recurring } from "./accounts/banking/transactions/recurring";
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
} from "./zero-relations";
