/** Drizzle v1-style `relations()` for `drizzle-zero` codegen only. DB runtime uses v2 `defineRelations` in `relations.ts`. */
import { relations } from "drizzle-orm/_relations";

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
import { plaidConnection } from "./providers/plaid/connection";
import { institution } from "./providers/plaid/institution";
import { snaptradeAuthorization } from "./providers/snaptrade/authorization";
import { snaptradeUser } from "./providers/snaptrade/user";
import { userAlerts } from "./users/alerts";
import { user, session, account } from "./users/auth/auth";
import { feedback } from "./users/feedback";
import { mobileSubscription } from "./users/subscriptions/mobile";
import { subscription } from "./users/subscriptions/stripe";

// Better Auth relations
export const userRelations = relations(user, ({ one, many }) => ({
  accounts: many(account),
  balances: many(balance),
  chats: many(chats),
  feedback: many(feedback),
  financialAccounts: many(financialAccount),
  financialGoals: many(financialGoals),
  holdings: many(holding),
  investmentActivities: many(investmentActivity),
  kalshiUser: one(kalshiUsers),
  messageVotes: many(messageVotes),
  mobileSubscriptions: many(mobileSubscription),
  orders: many(orders),
  plaidConnections: many(plaidConnection),
  recurringStreams: many(recurring),
  sessions: many(session),
  snapshots: many(snapshot),
  snaptradeAuthorizations: many(snaptradeAuthorization),
  snaptradeUser: one(snaptradeUser),
  subscriptions: many(subscription),
  transactions: many(transaction),
  userAlerts: many(userAlerts),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.referenceId],
    references: [user.id],
  }),
}));

// Chat relations
export const chatsRelations = relations(chats, ({ one, many }) => ({
  messages: many(messages),
  user: one(user, {
    fields: [chats.userId],
    references: [user.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.chatId],
  }),
  parts: many(parts),
  votes: many(messageVotes),
}));

export const partsRelations = relations(parts, ({ one }) => ({
  message: one(messages, {
    fields: [parts.messageId],
    references: [messages.messageId],
  }),
}));

// Unified-schema (SRI-264) relations

export const financialAccountRelations = relations(
  financialAccount,
  ({ one, many }) => ({
    balance: one(balance),
    creditLiability: one(creditLiability),
    holdings: many(holding),
    investmentActivities: many(investmentActivity),
    mortgageLiability: one(mortgageLiability),
    orders: many(orders),
    plaidConnection: one(plaidConnection, {
      fields: [financialAccount.plaidConnectionId],
      references: [plaidConnection.id],
    }),
    recurringStreams: many(recurring),
    snapshots: many(snapshot),
    snaptradeAuthorization: one(snaptradeAuthorization, {
      fields: [financialAccount.snaptradeAuthorizationId],
      references: [snaptradeAuthorization.id],
    }),
    studentLoanLiability: one(studentLoanLiability),
    transactions: many(transaction),
    user: one(user, {
      fields: [financialAccount.userId],
      references: [user.id],
    }),
  })
);

export const balanceRelations = relations(balance, ({ one }) => ({
  account: one(financialAccount, {
    fields: [balance.accountId],
    references: [financialAccount.id],
  }),
  user: one(user, {
    fields: [balance.userId],
    references: [user.id],
  }),
}));

export const snapshotRelations = relations(snapshot, ({ one }) => ({
  account: one(financialAccount, {
    fields: [snapshot.accountId],
    references: [financialAccount.id],
  }),
  user: one(user, {
    fields: [snapshot.userId],
    references: [user.id],
  }),
}));

export const securityRelations = relations(security, ({ many }) => ({
  holdings: many(holding),
  investmentActivities: many(investmentActivity),
  orders: many(orders),
}));

export const holdingRelations = relations(holding, ({ one }) => ({
  account: one(financialAccount, {
    fields: [holding.accountId],
    references: [financialAccount.id],
  }),
  security: one(security, {
    fields: [holding.securityId],
    references: [security.id],
  }),
  user: one(user, {
    fields: [holding.userId],
    references: [user.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  account: one(financialAccount, {
    fields: [orders.accountId],
    references: [financialAccount.id],
  }),
  security: one(security, {
    fields: [orders.securityId],
    references: [security.id],
  }),
  user: one(user, {
    fields: [orders.userId],
    references: [user.id],
  }),
}));

export const transactionRelations = relations(transaction, ({ many, one }) => ({
  account: one(financialAccount, {
    fields: [transaction.accountId],
    references: [financialAccount.id],
  }),
  edits: many(transactionEdit),
  user: one(user, {
    fields: [transaction.userId],
    references: [user.id],
  }),
}));

export const transactionEditRelations = relations(
  transactionEdit,
  ({ one }) => ({
    transaction: one(transaction, {
      fields: [transactionEdit.transactionId],
      references: [transaction.id],
    }),
  })
);

export const recurringStreamRelations = relations(recurring, ({ one }) => ({
  account: one(financialAccount, {
    fields: [recurring.accountId],
    references: [financialAccount.id],
  }),
  user: one(user, {
    fields: [recurring.userId],
    references: [user.id],
  }),
}));

export const investmentActivityRelations = relations(
  investmentActivity,
  ({ one }) => ({
    account: one(financialAccount, {
      fields: [investmentActivity.accountId],
      references: [financialAccount.id],
    }),
    security: one(security, {
      fields: [investmentActivity.securityId],
      references: [security.id],
    }),
    user: one(user, {
      fields: [investmentActivity.userId],
      references: [user.id],
    }),
  })
);

export const creditLiabilityRelations = relations(
  creditLiability,
  ({ one }) => ({
    account: one(financialAccount, {
      fields: [creditLiability.accountId],
      references: [financialAccount.id],
    }),
    user: one(user, {
      fields: [creditLiability.userId],
      references: [user.id],
    }),
  })
);

export const mortgageLiabilityRelations = relations(
  mortgageLiability,
  ({ one }) => ({
    account: one(financialAccount, {
      fields: [mortgageLiability.accountId],
      references: [financialAccount.id],
    }),
    user: one(user, {
      fields: [mortgageLiability.userId],
      references: [user.id],
    }),
  })
);

export const studentLoanLiabilityRelations = relations(
  studentLoanLiability,
  ({ one }) => ({
    account: one(financialAccount, {
      fields: [studentLoanLiability.accountId],
      references: [financialAccount.id],
    }),
    user: one(user, {
      fields: [studentLoanLiability.userId],
      references: [user.id],
    }),
  })
);

export const plaidConnectionRelations = relations(
  plaidConnection,
  ({ one, many }) => ({
    accounts: many(financialAccount),
    institution: one(institution, {
      fields: [plaidConnection.institutionId],
      references: [institution.plaidInstitutionId],
    }),
    user: one(user, {
      fields: [plaidConnection.userId],
      references: [user.id],
    }),
  })
);

export const snaptradeAuthorizationRelations = relations(
  snaptradeAuthorization,
  ({ one, many }) => ({
    accounts: many(financialAccount),
    user: one(user, {
      fields: [snaptradeAuthorization.userId],
      references: [user.id],
    }),
  })
);

export const snaptradeUserRelations = relations(snaptradeUser, ({ one }) => ({
  user: one(user, {
    fields: [snaptradeUser.userId],
    references: [user.id],
  }),
}));

export const institutionRelations = relations(institution, ({ many }) => ({
  plaidConnections: many(plaidConnection),
}));

// Financial events relations
export const financialEventsRelations = relations(
  financialEvents,
  ({ many }) => ({
    articles: many(eventArticles),
  })
);

export const eventArticlesRelations = relations(eventArticles, ({ one }) => ({
  financialEvent: one(financialEvents, {
    fields: [eventArticles.financialEventId],
    references: [financialEvents.id],
  }),
}));

// User alerts relations
export const userAlertsRelations = relations(userAlerts, ({ one }) => ({
  user: one(user, {
    fields: [userAlerts.userId],
    references: [user.id],
  }),
}));

// Financial goals relations
export const financialGoalsRelations = relations(financialGoals, ({ one }) => ({
  user: one(user, {
    fields: [financialGoals.userId],
    references: [user.id],
  }),
}));

// Mobile subscription relations
export const mobileSubscriptionRelations = relations(
  mobileSubscription,
  ({ one }) => ({
    user: one(user, {
      fields: [mobileSubscription.userId],
      references: [user.id],
    }),
  })
);

// Kalshi relations
export const kalshiUserRelations = relations(kalshiUsers, ({ one }) => ({
  user: one(user, {
    fields: [kalshiUsers.userId],
    references: [user.id],
  }),
}));

// Feedback relations
export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(user, {
    fields: [feedback.userId],
    references: [user.id],
  }),
}));

// Message vote relations
export const messageVotesRelations = relations(messageVotes, ({ one }) => ({
  message: one(messages, {
    fields: [messageVotes.messageId],
    references: [messages.messageId],
  }),
  user: one(user, {
    fields: [messageVotes.userId],
    references: [user.id],
  }),
}));
