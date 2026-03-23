/** Drizzle v1-style `relations()` for `drizzle-zero` codegen only. DB runtime uses v2 `defineRelations` in `relations.ts`. */
import { relations } from "drizzle-orm/_relations";

import { chats, messages, parts } from "./ai/chat";
import { user, session, account, subscription } from "./auth/auth";
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

// Better Auth relations
export const userRelations = relations(user, ({ one, many }) => ({
  accounts: many(account),
  bankConnections: many(bankConnection),
  brokerageAccountDetails: many(brokerageAccountDetails),
  brokerageAccounts: many(brokerageAccounts),
  brokerageActivities: many(brokerageActivities),
  brokerageAuthorizations: many(brokerageAuthorizations),
  brokerageBalances: many(brokerageBalances),
  brokerageOrders: many(brokerageOrders),
  brokeragePositions: many(brokeragePositions),
  brokerageUser: one(brokerageUser),
  chats: many(chats),
  feedback: many(feedback),
  financialGoals: many(financialGoals),
  kalshiUser: one(kalshiUsers),
  messageVotes: many(messageVotes),
  mobileSubscriptions: many(mobileSubscription),
  portfolioSnapshots: many(portfolioSnapshots),
  sessions: many(session),
  subscriptions: many(subscription),
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

// Banking relations
export const bankConnectionRelations = relations(
  bankConnection,
  ({ one, many }) => ({
    accounts: many(bankAccount),
    institution: one(institution, {
      fields: [bankConnection.institutionId],
      references: [institution.plaidInstitutionId],
    }),
    user: one(user, {
      fields: [bankConnection.userId],
      references: [user.id],
    }),
  })
);

export const bankAccountRelations = relations(bankAccount, ({ one, many }) => ({
  balanceSnapshots: many(bankBalanceSnapshot),
  balances: many(bankBalance),
  connection: one(bankConnection, {
    fields: [bankAccount.plaidItemId],
    references: [bankConnection.plaidItemId],
  }),
  creditLiability: many(creditLiability),
  investmentActivities: many(investmentActivity),
  investmentPositions: many(investmentPosition),
  mortgageLiability: many(mortgageLiability),
  recurringStreams: many(recurringStream),
  studentLoanLiability: many(studentLoanLiability),
  transactions: many(transaction),
}));

export const bankBalanceRelations = relations(bankBalance, ({ one }) => ({
  account: one(bankAccount, {
    fields: [bankBalance.plaidAccountId],
    references: [bankAccount.plaidAccountId],
  }),
}));

export const bankBalanceSnapshotRelations = relations(
  bankBalanceSnapshot,
  ({ one }) => ({
    account: one(bankAccount, {
      fields: [bankBalanceSnapshot.plaidAccountId],
      references: [bankAccount.plaidAccountId],
    }),
  })
);

export const transactionRelations = relations(transaction, ({ one }) => ({
  account: one(bankAccount, {
    fields: [transaction.plaidAccountId],
    references: [bankAccount.plaidAccountId],
  }),
}));

export const recurringStreamRelations = relations(
  recurringStream,
  ({ one }) => ({
    account: one(bankAccount, {
      fields: [recurringStream.plaidAccountId],
      references: [bankAccount.plaidAccountId],
    }),
  })
);

export const creditLiabilityRelations = relations(
  creditLiability,
  ({ one }) => ({
    account: one(bankAccount, {
      fields: [creditLiability.plaidAccountId],
      references: [bankAccount.plaidAccountId],
    }),
  })
);

export const mortgageLiabilityRelations = relations(
  mortgageLiability,
  ({ one }) => ({
    account: one(bankAccount, {
      fields: [mortgageLiability.plaidAccountId],
      references: [bankAccount.plaidAccountId],
    }),
  })
);

export const studentLoanLiabilityRelations = relations(
  studentLoanLiability,
  ({ one }) => ({
    account: one(bankAccount, {
      fields: [studentLoanLiability.plaidAccountId],
      references: [bankAccount.plaidAccountId],
    }),
  })
);

// Investment relations
export const investmentSecurityRelations = relations(
  investmentSecurity,
  ({ many }) => ({
    activities: many(investmentActivity),
    positions: many(investmentPosition),
  })
);

export const investmentPositionRelations = relations(
  investmentPosition,
  ({ one }) => ({
    account: one(bankAccount, {
      fields: [investmentPosition.plaidAccountId],
      references: [bankAccount.plaidAccountId],
    }),
    security: one(investmentSecurity, {
      fields: [investmentPosition.securityId],
      references: [investmentSecurity.securityId],
    }),
  })
);

export const investmentActivityRelations = relations(
  investmentActivity,
  ({ one }) => ({
    account: one(bankAccount, {
      fields: [investmentActivity.plaidAccountId],
      references: [bankAccount.plaidAccountId],
    }),
    security: one(investmentSecurity, {
      fields: [investmentActivity.securityId],
      references: [investmentSecurity.securityId],
    }),
  })
);

// Brokerage relations
export const brokerageUserRelations = relations(
  brokerageUser,
  ({ one, many }) => ({
    brokerageAuthorizations: many(brokerageAuthorizations),
    user: one(user, {
      fields: [brokerageUser.userId],
      references: [user.id],
    }),
  })
);

export const brokerageAuthorizationRelations = relations(
  brokerageAuthorizations,
  ({ one, many }) => ({
    brokerageAccounts: many(brokerageAccounts),
    brokerageUser: one(brokerageUser, {
      fields: [brokerageAuthorizations.userId],
      references: [brokerageUser.userId],
    }),
    user: one(user, {
      fields: [brokerageAuthorizations.userId],
      references: [user.id],
    }),
  })
);

export const brokerageAccountRelations = relations(
  brokerageAccounts,
  ({ one, many }) => ({
    accountDetails: many(brokerageAccountDetails),
    activities: many(brokerageActivities),
    balances: many(brokerageBalances),
    brokerageAuthorization: one(brokerageAuthorizations, {
      fields: [brokerageAccounts.brokerageAuthId],
      references: [brokerageAuthorizations.id],
    }),
    orders: many(brokerageOrders),
    positions: many(brokeragePositions),
    user: one(user, {
      fields: [brokerageAccounts.userId],
      references: [user.id],
    }),
  })
);

export const brokerageAccountDetailsRelations = relations(
  brokerageAccountDetails,
  ({ one }) => ({
    brokerageAccount: one(brokerageAccounts, {
      fields: [brokerageAccountDetails.accountId],
      references: [brokerageAccounts.id],
    }),
    user: one(user, {
      fields: [brokerageAccountDetails.userId],
      references: [user.id],
    }),
  })
);

export const brokerageBalanceRelations = relations(
  brokerageBalances,
  ({ one }) => ({
    brokerageAccount: one(brokerageAccounts, {
      fields: [brokerageBalances.accountId],
      references: [brokerageAccounts.id],
    }),
    user: one(user, {
      fields: [brokerageBalances.userId],
      references: [user.id],
    }),
  })
);

export const brokeragePositionRelations = relations(
  brokeragePositions,
  ({ one }) => ({
    brokerageAccount: one(brokerageAccounts, {
      fields: [brokeragePositions.accountId],
      references: [brokerageAccounts.id],
    }),
    user: one(user, {
      fields: [brokeragePositions.userId],
      references: [user.id],
    }),
  })
);

export const brokerageOrderRelations = relations(
  brokerageOrders,
  ({ one }) => ({
    brokerageAccount: one(brokerageAccounts, {
      fields: [brokerageOrders.accountId],
      references: [brokerageAccounts.id],
    }),
    user: one(user, {
      fields: [brokerageOrders.userId],
      references: [user.id],
    }),
  })
);

export const brokerageActivityRelations = relations(
  brokerageActivities,
  ({ one }) => ({
    brokerageAccount: one(brokerageAccounts, {
      fields: [brokerageActivities.accountId],
      references: [brokerageAccounts.id],
    }),
    user: one(user, {
      fields: [brokerageActivities.userId],
      references: [user.id],
    }),
  })
);

// Portfolio snapshot relations
export const portfolioSnapshotRelations = relations(
  portfolioSnapshots,
  ({ one }) => ({
    user: one(user, {
      fields: [portfolioSnapshots.userId],
      references: [user.id],
    }),
  })
);

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
