// Barrel file for drizzle-zero — named exports of all tables and relations.
// drizzle-zero requires a single TS file (not a folder) for type resolution.

// Tables
export {
  user,
  session,
  account,
  verification,
  subscription,
} from "./auth/auth";
export { chats, messages, parts } from "./ai/chat";
export { institution, bankConnection } from "./banking/items";
export {
  bankAccount,
  bankBalance,
  bankBalanceSnapshot,
} from "./banking/accounts";
export { transaction, recurringStream } from "./banking/transactions/tables";
export {
  creditLiability,
  mortgageLiability,
  studentLoanLiability,
} from "./banking/liabilities";
export {
  investmentSecurity,
  investmentPosition,
  investmentActivity,
} from "./banking/investments";
export { brokerageUser } from "./brokerage/users";
export { brokerageAuthorizations } from "./brokerage/auth";
export {
  brokerageAccounts,
  brokerageAccountDetails,
} from "./brokerage/accounts";
export { brokerageBalances, brokeragePositions } from "./brokerage/balances";
export { brokerageOrders, brokerageActivities } from "./brokerage/trading";
export { portfolioSnapshots } from "./brokerage/snapshots";
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
  chatsRelations,
  messagesRelations,
  partsRelations,
  bankConnectionRelations,
  bankAccountRelations,
  bankBalanceRelations,
  bankBalanceSnapshotRelations,
  transactionRelations,
  recurringStreamRelations,
  creditLiabilityRelations,
  mortgageLiabilityRelations,
  studentLoanLiabilityRelations,
  investmentSecurityRelations,
  investmentPositionRelations,
  investmentActivityRelations,
  brokerageUserRelations,
  brokerageAuthorizationRelations,
  brokerageAccountRelations,
  brokerageAccountDetailsRelations,
  brokerageBalanceRelations,
  brokeragePositionRelations,
  brokerageOrderRelations,
  brokerageActivityRelations,
  portfolioSnapshotRelations,
  financialEventsRelations,
  eventArticlesRelations,
  userAlertsRelations,
  financialGoalsRelations,
  mobileSubscriptionRelations,
  kalshiUserRelations,
  feedbackRelations,
  messageVotesRelations,
} from "./relations-drizzle-zero";
