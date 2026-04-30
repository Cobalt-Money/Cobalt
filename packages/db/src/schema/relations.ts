import { defineRelations } from "drizzle-orm";

import { financialAccount } from "./accounts/account";
import { balance } from "./accounts/balance";
import { creditLiability } from "./accounts/banking/liabilities/credit";
import { mortgageLiability } from "./accounts/banking/liabilities/mortgage";
import { studentLoanLiability } from "./accounts/banking/liabilities/student-loan";
import { recurring } from "./accounts/banking/transactions/recurring";
import { transaction } from "./accounts/banking/transactions/transaction";
import { transactionEdit } from "./accounts/banking/transactions/transaction-edit";
import { holding } from "./accounts/investments/holding";
import { investmentActivity } from "./accounts/investments/investment-activity";
import { orders } from "./accounts/investments/order";
import { security } from "./accounts/investments/security";
import { kalshiUsers } from "./accounts/prediction-markets/kalshi";
import { snapshot } from "./accounts/snapshot";
import { chats, messages, parts } from "./ai/chat";
import { messageVotes } from "./ai/message-votes";
import { financialGoals } from "./goals/financial-goals";
import { financialEvents, eventArticles } from "./news/financial-events";
import { rssArticles, rssFeeds } from "./news/rss";
import { plaidConnection } from "./providers/plaid/connection";
import { institution } from "./providers/plaid/institution";
import { snaptradeAuthorization } from "./providers/snaptrade/authorization";
import { snaptradeUser } from "./providers/snaptrade/user";
import { fundamentals } from "./research/fundamentals";
import { tickers } from "./research/tickers";
import { userAlerts } from "./users/alerts";
import { user, session, account } from "./users/auth/auth";
import { feedback } from "./users/feedback";
import { mobileSubscription } from "./users/subscriptions/mobile";
import { subscription } from "./users/subscriptions/stripe";

/** Tables referenced by relational queries — must cover every `r.*` use in `defineRelations`. */
const schema = {
  account,
  balance,
  chats,
  creditLiability,
  eventArticles,
  feedback,
  financialAccount,
  financialEvents,
  financialGoals,
  fundamentals,
  holding,
  institution,
  investmentActivity,
  kalshiUsers,
  messageVotes,
  messages,
  mobileSubscription,
  mortgageLiability,
  orders,
  parts,
  plaidConnection,
  recurring,
  rssArticles,
  rssFeeds,
  security,
  session,
  snapshot,
  snaptradeAuthorization,
  snaptradeUser,
  studentLoanLiability,
  subscription,
  tickers,
  transaction,
  transactionEdit,
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

  balance: {
    account: r.one.financialAccount({
      from: r.balance.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    user: r.one.user({
      from: r.balance.userId,
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
    account: r.one.financialAccount({
      from: r.creditLiability.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    user: r.one.user({
      from: r.creditLiability.userId,
      to: r.user.id,
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

  financialAccount: {
    balance: r.one.balance({
      from: r.financialAccount.id,
      optional: true,
      to: r.balance.accountId,
    }),
    creditLiability: r.one.creditLiability({
      from: r.financialAccount.id,
      optional: true,
      to: r.creditLiability.accountId,
    }),
    holdings: r.many.holding({
      from: r.financialAccount.id,
      to: r.holding.accountId,
    }),
    investmentActivities: r.many.investmentActivity({
      from: r.financialAccount.id,
      to: r.investmentActivity.accountId,
    }),
    mortgageLiability: r.one.mortgageLiability({
      from: r.financialAccount.id,
      optional: true,
      to: r.mortgageLiability.accountId,
    }),
    orders: r.many.orders({
      from: r.financialAccount.id,
      to: r.orders.accountId,
    }),
    plaidConnection: r.one.plaidConnection({
      from: r.financialAccount.plaidConnectionId,
      optional: true,
      to: r.plaidConnection.id,
    }),
    recurringStreams: r.many.recurring({
      from: r.financialAccount.id,
      to: r.recurring.accountId,
    }),
    snapshots: r.many.snapshot({
      from: r.financialAccount.id,
      to: r.snapshot.accountId,
    }),
    snaptradeAuthorization: r.one.snaptradeAuthorization({
      from: r.financialAccount.snaptradeAuthorizationId,
      optional: true,
      to: r.snaptradeAuthorization.id,
    }),
    studentLoanLiability: r.one.studentLoanLiability({
      from: r.financialAccount.id,
      optional: true,
      to: r.studentLoanLiability.accountId,
    }),
    transactions: r.many.transaction({
      from: r.financialAccount.id,
      to: r.transaction.accountId,
    }),
    user: r.one.user({
      from: r.financialAccount.userId,
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

  fundamentals: {
    ticker: r.one.tickers({
      from: r.fundamentals.symbol,
      optional: false,
      to: r.tickers.symbol,
    }),
  },

  holding: {
    account: r.one.financialAccount({
      from: r.holding.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    security: r.one.security({
      from: r.holding.securityId,
      optional: false,
      to: r.security.id,
    }),
    user: r.one.user({
      from: r.holding.userId,
      to: r.user.id,
    }),
  },

  investmentActivity: {
    account: r.one.financialAccount({
      from: r.investmentActivity.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    security: r.one.security({
      from: r.investmentActivity.securityId,
      optional: true,
      to: r.security.id,
    }),
    user: r.one.user({
      from: r.investmentActivity.userId,
      to: r.user.id,
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
    account: r.one.financialAccount({
      from: r.mortgageLiability.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    user: r.one.user({
      from: r.mortgageLiability.userId,
      to: r.user.id,
    }),
  },

  orders: {
    account: r.one.financialAccount({
      from: r.orders.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    security: r.one.security({
      from: r.orders.securityId,
      optional: true,
      to: r.security.id,
    }),
    user: r.one.user({
      from: r.orders.userId,
      to: r.user.id,
    }),
  },

  parts: {
    message: r.one.messages({
      from: r.parts.messageId,
      to: r.messages.messageId,
    }),
  },

  plaidConnection: {
    accounts: r.many.financialAccount({
      from: r.plaidConnection.id,
      to: r.financialAccount.plaidConnectionId,
    }),
    institution: r.one.institution({
      from: r.plaidConnection.institutionId,
      optional: true,
      to: r.institution.plaidInstitutionId,
    }),
    user: r.one.user({
      from: r.plaidConnection.userId,
      to: r.user.id,
    }),
  },

  recurring: {
    account: r.one.financialAccount({
      from: r.recurring.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    user: r.one.user({
      from: r.recurring.userId,
      to: r.user.id,
    }),
  },

  rssArticles: {},

  rssFeeds: {},

  security: {
    holdings: r.many.holding({
      from: r.security.id,
      to: r.holding.securityId,
    }),
    investmentActivities: r.many.investmentActivity({
      from: r.security.id,
      to: r.investmentActivity.securityId,
    }),
    orders: r.many.orders({
      from: r.security.id,
      to: r.orders.securityId,
    }),
  },

  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },

  snapshot: {
    account: r.one.financialAccount({
      from: r.snapshot.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    user: r.one.user({
      from: r.snapshot.userId,
      to: r.user.id,
    }),
  },

  snaptradeAuthorization: {
    accounts: r.many.financialAccount({
      from: r.snaptradeAuthorization.id,
      to: r.financialAccount.snaptradeAuthorizationId,
    }),
    user: r.one.user({
      from: r.snaptradeAuthorization.userId,
      to: r.user.id,
    }),
  },

  snaptradeUser: {
    user: r.one.user({
      from: r.snaptradeUser.userId,
      to: r.user.id,
    }),
  },

  studentLoanLiability: {
    account: r.one.financialAccount({
      from: r.studentLoanLiability.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    user: r.one.user({
      from: r.studentLoanLiability.userId,
      to: r.user.id,
    }),
  },
  subscription: {
    user: r.one.user({
      from: r.subscription.referenceId,
      to: r.user.id,
    }),
  },

  tickers: {
    fundamentals: r.many.fundamentals({
      from: r.tickers.symbol,
      to: r.fundamentals.symbol,
    }),
  },

  transaction: {
    account: r.one.financialAccount({
      from: r.transaction.accountId,
      optional: false,
      to: r.financialAccount.id,
    }),
    edits: r.many.transactionEdit({
      from: r.transaction.id,
      to: r.transactionEdit.transactionId,
    }),
    user: r.one.user({
      from: r.transaction.userId,
      to: r.user.id,
    }),
  },

  transactionEdit: {
    transaction: r.one.transaction({
      from: r.transactionEdit.transactionId,
      optional: false,
      to: r.transaction.id,
    }),
    user: r.one.user({
      from: r.transactionEdit.userId,
      to: r.user.id,
    }),
  },

  user: {
    accounts: r.many.account({
      from: r.user.id,
      to: r.account.userId,
    }),
    balances: r.many.balance({
      from: r.user.id,
      to: r.balance.userId,
    }),
    chats: r.many.chats({
      from: r.user.id,
      to: r.chats.userId,
    }),
    feedback: r.many.feedback({
      from: r.user.id,
      to: r.feedback.userId,
    }),
    financialAccounts: r.many.financialAccount({
      from: r.user.id,
      to: r.financialAccount.userId,
    }),
    financialGoals: r.many.financialGoals({
      from: r.user.id,
      to: r.financialGoals.userId,
    }),
    holdings: r.many.holding({
      from: r.user.id,
      to: r.holding.userId,
    }),
    investmentActivities: r.many.investmentActivity({
      from: r.user.id,
      to: r.investmentActivity.userId,
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
    orders: r.many.orders({
      from: r.user.id,
      to: r.orders.userId,
    }),
    plaidConnections: r.many.plaidConnection({
      from: r.user.id,
      to: r.plaidConnection.userId,
    }),
    recurringStreams: r.many.recurring({
      from: r.user.id,
      to: r.recurring.userId,
    }),
    sessions: r.many.session({
      from: r.user.id,
      to: r.session.userId,
    }),
    snapshots: r.many.snapshot({
      from: r.user.id,
      to: r.snapshot.userId,
    }),
    snaptradeAuthorizations: r.many.snaptradeAuthorization({
      from: r.user.id,
      to: r.snaptradeAuthorization.userId,
    }),
    snaptradeUser: r.one.snaptradeUser({
      from: r.user.id,
      to: r.snaptradeUser.userId,
    }),
    subscriptions: r.many.subscription({
      from: r.user.id,
      to: r.subscription.referenceId,
    }),
    transactions: r.many.transaction({
      from: r.user.id,
      to: r.transaction.userId,
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
