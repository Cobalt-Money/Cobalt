import { defineRelations } from "drizzle-orm";

import { chats, messages, parts } from "./ai/chat";
import { user, session, account } from "./auth/auth";
import {
  bankConnection,
  bankAccount,
  bankBalance,
  bankBalanceSnapshot,
  transaction,
  recurringStream,
  creditLiability,
  mortgageLiability,
  studentLoanLiability,
  institution,
} from "./banking";
import {
  investmentSecurity,
  investmentPosition,
  investmentActivity,
} from "./banking/investments";
import {
  brokerageUser,
  brokerageAuthorizations,
  brokerageAccounts,
  brokerageAccountDetails,
  brokerageBalances,
  brokeragePositions,
  brokerageOrders,
  brokerageActivities,
  portfolioSnapshots,
} from "./brokerage";
import { feedback } from "./features/feedback";
import { financialEvents, eventArticles } from "./features/financial-events";
import { financialGoals } from "./features/financial-goals";
import { kalshiUsers } from "./features/kalshi";
import { messageVotes } from "./features/message-votes";
import { userAlerts } from "./features/user-alerts";
import { mobileSubscription } from "./mobile/subscriptions";

/** Tables referenced by relational queries — must cover every `r.*` use in `defineRelations`. */
const schema = {
  account,
  bankAccount,
  bankBalance,
  bankBalanceSnapshot,
  bankConnection,
  brokerageAccountDetails,
  brokerageAccounts,
  brokerageActivities,
  brokerageAuthorizations,
  brokerageBalances,
  brokerageOrders,
  brokeragePositions,
  brokerageUser,
  chats,
  creditLiability,
  eventArticles,
  feedback,
  financialEvents,
  financialGoals,
  institution,
  investmentActivity,
  investmentPosition,
  investmentSecurity,
  kalshiUsers,
  messageVotes,
  messages,
  mobileSubscription,
  mortgageLiability,
  parts,
  portfolioSnapshots,
  recurringStream,
  session,
  studentLoanLiability,
  transaction,
  user,
  userAlerts,
} as const;

export const relations = defineRelations(schema, (r) => ({
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },

  bankAccount: {
    balanceSnapshots: r.many.bankBalanceSnapshot({
      from: r.bankAccount.plaidAccountId,
      to: r.bankBalanceSnapshot.plaidAccountId,
    }),
    balances: r.many.bankBalance({
      from: r.bankAccount.plaidAccountId,
      to: r.bankBalance.plaidAccountId,
    }),
    connection: r.one.bankConnection({
      from: r.bankAccount.plaidItemId,
      optional: false,
      to: r.bankConnection.plaidItemId,
    }),
    creditLiability: r.many.creditLiability({
      from: r.bankAccount.plaidAccountId,
      to: r.creditLiability.plaidAccountId,
    }),
    investmentActivities: r.many.investmentActivity({
      from: r.bankAccount.plaidAccountId,
      to: r.investmentActivity.plaidAccountId,
    }),
    investmentPositions: r.many.investmentPosition({
      from: r.bankAccount.plaidAccountId,
      to: r.investmentPosition.plaidAccountId,
    }),
    mortgageLiability: r.many.mortgageLiability({
      from: r.bankAccount.plaidAccountId,
      to: r.mortgageLiability.plaidAccountId,
    }),
    recurringStreams: r.many.recurringStream({
      from: r.bankAccount.plaidAccountId,
      to: r.recurringStream.plaidAccountId,
    }),
    studentLoanLiability: r.many.studentLoanLiability({
      from: r.bankAccount.plaidAccountId,
      to: r.studentLoanLiability.plaidAccountId,
    }),
    transactions: r.many.transaction({
      from: r.bankAccount.plaidAccountId,
      to: r.transaction.plaidAccountId,
    }),
  },

  bankBalance: {
    account: r.one.bankAccount({
      from: r.bankBalance.plaidAccountId,
      to: r.bankAccount.plaidAccountId,
    }),
  },

  bankBalanceSnapshot: {
    account: r.one.bankAccount({
      from: r.bankBalanceSnapshot.plaidAccountId,
      to: r.bankAccount.plaidAccountId,
    }),
  },

  bankConnection: {
    accounts: r.many.bankAccount({
      from: r.bankConnection.plaidItemId,
      to: r.bankAccount.plaidItemId,
    }),
    institution: r.one.institution({
      from: r.bankConnection.institutionId,
      optional: true,
      to: r.institution.plaidInstitutionId,
    }),
    user: r.one.user({
      from: r.bankConnection.userId,
      to: r.user.id,
    }),
  },

  brokerageAccountDetails: {
    brokerageAccount: r.one.brokerageAccounts({
      from: r.brokerageAccountDetails.accountId,
      to: r.brokerageAccounts.id,
    }),
    user: r.one.user({
      from: r.brokerageAccountDetails.userId,
      to: r.user.id,
    }),
  },

  brokerageAccounts: {
    accountDetails: r.many.brokerageAccountDetails({
      from: r.brokerageAccounts.id,
      to: r.brokerageAccountDetails.accountId,
    }),
    activities: r.many.brokerageActivities({
      from: r.brokerageAccounts.id,
      to: r.brokerageActivities.accountId,
    }),
    balances: r.many.brokerageBalances({
      from: r.brokerageAccounts.id,
      to: r.brokerageBalances.accountId,
    }),
    brokerageAuthorization: r.one.brokerageAuthorizations({
      from: r.brokerageAccounts.brokerageAuthId,
      to: r.brokerageAuthorizations.id,
    }),
    orders: r.many.brokerageOrders({
      from: r.brokerageAccounts.id,
      to: r.brokerageOrders.accountId,
    }),
    positions: r.many.brokeragePositions({
      from: r.brokerageAccounts.id,
      to: r.brokeragePositions.accountId,
    }),
    user: r.one.user({
      from: r.brokerageAccounts.userId,
      to: r.user.id,
    }),
  },

  brokerageActivities: {
    brokerageAccount: r.one.brokerageAccounts({
      from: r.brokerageActivities.accountId,
      to: r.brokerageAccounts.id,
    }),
    user: r.one.user({
      from: r.brokerageActivities.userId,
      to: r.user.id,
    }),
  },

  brokerageAuthorizations: {
    brokerageAccounts: r.many.brokerageAccounts({
      from: r.brokerageAuthorizations.id,
      to: r.brokerageAccounts.brokerageAuthId,
    }),
    brokerageUser: r.one.brokerageUser({
      from: r.brokerageAuthorizations.userId,
      to: r.brokerageUser.userId,
    }),
    user: r.one.user({
      from: r.brokerageAuthorizations.userId,
      to: r.user.id,
    }),
  },

  brokerageBalances: {
    brokerageAccount: r.one.brokerageAccounts({
      from: r.brokerageBalances.accountId,
      to: r.brokerageAccounts.id,
    }),
    user: r.one.user({
      from: r.brokerageBalances.userId,
      to: r.user.id,
    }),
  },

  brokerageOrders: {
    brokerageAccount: r.one.brokerageAccounts({
      from: r.brokerageOrders.accountId,
      to: r.brokerageAccounts.id,
    }),
    user: r.one.user({
      from: r.brokerageOrders.userId,
      to: r.user.id,
    }),
  },

  brokeragePositions: {
    brokerageAccount: r.one.brokerageAccounts({
      from: r.brokeragePositions.accountId,
      to: r.brokerageAccounts.id,
    }),
    user: r.one.user({
      from: r.brokeragePositions.userId,
      to: r.user.id,
    }),
  },

  brokerageUser: {
    brokerageAuthorizations: r.many.brokerageAuthorizations({
      from: r.brokerageUser.userId,
      to: r.brokerageAuthorizations.userId,
    }),
    user: r.one.user({
      from: r.brokerageUser.userId,
      to: r.user.id,
    }),
  },

  chats: {
    messages: r.many.messages({
      from: r.chats.chatId,
      to: r.messages.chatId,
    }),
    user: r.one.user({
      from: r.chats.userId,
      to: r.user.id,
    }),
  },

  creditLiability: {
    account: r.one.bankAccount({
      from: r.creditLiability.plaidAccountId,
      to: r.bankAccount.plaidAccountId,
    }),
  },

  eventArticles: {
    financialEvent: r.one.financialEvents({
      from: r.eventArticles.financialEventId,
      to: r.financialEvents.id,
    }),
  },

  feedback: {
    user: r.one.user({
      from: r.feedback.userId,
      to: r.user.id,
    }),
  },

  financialEvents: {
    articles: r.many.eventArticles({
      from: r.financialEvents.id,
      to: r.eventArticles.financialEventId,
    }),
  },

  financialGoals: {
    user: r.one.user({
      from: r.financialGoals.userId,
      to: r.user.id,
    }),
  },

  investmentActivity: {
    account: r.one.bankAccount({
      from: r.investmentActivity.plaidAccountId,
      to: r.bankAccount.plaidAccountId,
    }),
    security: r.one.investmentSecurity({
      from: r.investmentActivity.securityId,
      to: r.investmentSecurity.securityId,
    }),
  },

  investmentPosition: {
    account: r.one.bankAccount({
      from: r.investmentPosition.plaidAccountId,
      to: r.bankAccount.plaidAccountId,
    }),
    security: r.one.investmentSecurity({
      from: r.investmentPosition.securityId,
      to: r.investmentSecurity.securityId,
    }),
  },

  investmentSecurity: {
    activities: r.many.investmentActivity({
      from: r.investmentSecurity.securityId,
      to: r.investmentActivity.securityId,
    }),
    positions: r.many.investmentPosition({
      from: r.investmentSecurity.securityId,
      to: r.investmentPosition.securityId,
    }),
  },

  kalshiUsers: {
    user: r.one.user({
      from: r.kalshiUsers.userId,
      to: r.user.id,
    }),
  },

  messageVotes: {
    message: r.one.messages({
      from: r.messageVotes.messageId,
      to: r.messages.messageId,
    }),
    user: r.one.user({
      from: r.messageVotes.userId,
      to: r.user.id,
    }),
  },

  messages: {
    chat: r.one.chats({
      from: r.messages.chatId,
      to: r.chats.chatId,
    }),
    parts: r.many.parts({
      from: r.messages.messageId,
      to: r.parts.messageId,
    }),
    votes: r.many.messageVotes({
      from: r.messages.messageId,
      to: r.messageVotes.messageId,
    }),
  },

  mobileSubscription: {
    user: r.one.user({
      from: r.mobileSubscription.userId,
      to: r.user.id,
    }),
  },

  mortgageLiability: {
    account: r.one.bankAccount({
      from: r.mortgageLiability.plaidAccountId,
      to: r.bankAccount.plaidAccountId,
    }),
  },

  parts: {
    message: r.one.messages({
      from: r.parts.messageId,
      to: r.messages.messageId,
    }),
  },

  portfolioSnapshots: {
    user: r.one.user({
      from: r.portfolioSnapshots.userId,
      to: r.user.id,
    }),
  },

  recurringStream: {
    account: r.one.bankAccount({
      from: r.recurringStream.plaidAccountId,
      optional: false,
      to: r.bankAccount.plaidAccountId,
    }),
  },

  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },

  studentLoanLiability: {
    account: r.one.bankAccount({
      from: r.studentLoanLiability.plaidAccountId,
      to: r.bankAccount.plaidAccountId,
    }),
  },

  transaction: {
    account: r.one.bankAccount({
      from: r.transaction.plaidAccountId,
      optional: false,
      to: r.bankAccount.plaidAccountId,
    }),
  },

  user: {
    accounts: r.many.account({
      from: r.user.id,
      to: r.account.userId,
    }),
    bankConnections: r.many.bankConnection({
      from: r.user.id,
      to: r.bankConnection.userId,
    }),
    brokerageAccountDetails: r.many.brokerageAccountDetails({
      from: r.user.id,
      to: r.brokerageAccountDetails.userId,
    }),
    brokerageAccounts: r.many.brokerageAccounts({
      from: r.user.id,
      to: r.brokerageAccounts.userId,
    }),
    brokerageActivities: r.many.brokerageActivities({
      from: r.user.id,
      to: r.brokerageActivities.userId,
    }),
    brokerageAuthorizations: r.many.brokerageAuthorizations({
      from: r.user.id,
      to: r.brokerageAuthorizations.userId,
    }),
    brokerageBalances: r.many.brokerageBalances({
      from: r.user.id,
      to: r.brokerageBalances.userId,
    }),
    brokerageOrders: r.many.brokerageOrders({
      from: r.user.id,
      to: r.brokerageOrders.userId,
    }),
    brokeragePositions: r.many.brokeragePositions({
      from: r.user.id,
      to: r.brokeragePositions.userId,
    }),
    brokerageUser: r.one.brokerageUser({
      from: r.user.id,
      to: r.brokerageUser.userId,
    }),
    chats: r.many.chats({
      from: r.user.id,
      to: r.chats.userId,
    }),
    feedback: r.many.feedback({
      from: r.user.id,
      to: r.feedback.userId,
    }),
    financialGoals: r.many.financialGoals({
      from: r.user.id,
      to: r.financialGoals.userId,
    }),
    kalshiUser: r.one.kalshiUsers({
      from: r.user.id,
      to: r.kalshiUsers.userId,
    }),
    messageVotes: r.many.messageVotes({
      from: r.user.id,
      to: r.messageVotes.userId,
    }),
    mobileSubscriptions: r.many.mobileSubscription({
      from: r.user.id,
      to: r.mobileSubscription.userId,
    }),
    portfolioSnapshots: r.many.portfolioSnapshots({
      from: r.user.id,
      to: r.portfolioSnapshots.userId,
    }),
    sessions: r.many.session({
      from: r.user.id,
      to: r.session.userId,
    }),
    userAlerts: r.many.userAlerts({
      from: r.user.id,
      to: r.userAlerts.userId,
    }),
  },

  userAlerts: {
    user: r.one.user({
      from: r.userAlerts.userId,
      to: r.user.id,
    }),
  },
}));
