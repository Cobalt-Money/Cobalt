import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  apikey: {
    user: r.one.user({
      from: r.apikey.referenceId,
      to: r.user.id,
    }),
  },
  category: {
    users: r.many.user({
      from: r.category.id.through(r.categoryMappingCache.targetCategoryId),
      to: r.user.id.through(r.categoryMappingCache.userId),
    }),
    recurrings: r.many.recurring(),
    transactions: r.many.transaction(),
  },
  categoryGroup: {
    users: r.many.user({
      from: r.categoryGroup.id.through(r.category.groupId),
      to: r.user.id.through(r.category.userId),
      alias: "categoryGroup_id_user_id_via_category",
    }),
    user: r.one.user({
      from: r.categoryGroup.userId,
      to: r.user.id,
      alias: "categoryGroup_userId_user_id",
    }),
  },
  chats: {
    user: r.one.user({
      from: r.chats.userId,
      to: r.user.id,
    }),
    messages: r.many.messages(),
  },
  csvColumnRoleCache: {
    user: r.one.user({
      from: r.csvColumnRoleCache.userId,
      to: r.user.id,
    }),
  },
  csvMappingCache: {
    user: r.one.user({
      from: r.csvMappingCache.userId,
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
    usersViaAccountMappingCache: r.many.user({
      from: r.financialAccount.id.through(r.accountMappingCache.cobaltAccountId),
      to: r.user.id.through(r.accountMappingCache.userId),
      alias: "financialAccount_id_user_id_via_accountMappingCache",
    }),
    usersViaBalance: r.many.user({
      from: r.financialAccount.id.through(r.balance.accountId),
      to: r.user.id.through(r.balance.userId),
      alias: "financialAccount_id_user_id_via_balance",
    }),
    usersViaCreditLiability: r.many.user({
      from: r.financialAccount.id.through(r.creditLiability.accountId),
      to: r.user.id.through(r.creditLiability.userId),
      alias: "financialAccount_id_user_id_via_creditLiability",
    }),
    snaptradeAuthorization: r.one.snaptradeAuthorization({
      from: r.financialAccount.snaptradeAuthorizationId,
      to: r.snaptradeAuthorization.id,
    }),
    plaidConnection: r.one.plaidConnection({
      from: r.financialAccount.plaidConnectionId,
      to: r.plaidConnection.id,
    }),
    user: r.one.user({
      from: r.financialAccount.userId,
      to: r.user.id,
      alias: "financialAccount_userId_user_id",
    }),
    holdings: r.many.holding(),
    investmentActivities: r.many.investmentActivity(),
    usersViaMortgageLiability: r.many.user({
      from: r.financialAccount.id.through(r.mortgageLiability.accountId),
      to: r.user.id.through(r.mortgageLiability.userId),
      alias: "financialAccount_id_user_id_via_mortgageLiability",
    }),
    orders: r.many.orders(),
    recurrings: r.many.recurring(),
    usersViaSnapshot: r.many.user({
      from: r.financialAccount.id.through(r.snapshot.accountId),
      to: r.user.id.through(r.snapshot.userId),
      alias: "financialAccount_id_user_id_via_snapshot",
    }),
    usersViaStudentLoanLiability: r.many.user({
      from: r.financialAccount.id.through(r.studentLoanLiability.accountId),
      to: r.user.id.through(r.studentLoanLiability.userId),
      alias: "financialAccount_id_user_id_via_studentLoanLiability",
    }),
    transactions: r.many.transaction(),
  },
  financialEvents: {
    eventArticles: r.many.eventArticles(),
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
      to: r.tickers.symbol,
    }),
  },
  holding: {
    financialAccount: r.one.financialAccount({
      from: r.holding.accountId,
      to: r.financialAccount.id,
    }),
    security: r.one.security({
      from: r.holding.securityId,
      to: r.security.id,
    }),
    user: r.one.user({
      from: r.holding.userId,
      to: r.user.id,
    }),
  },
  importJob: {
    user: r.one.user({
      from: r.importJob.userId,
      to: r.user.id,
    }),
    transactionsViaImportStagedTransaction: r.many.transaction({
      alias: "transaction_id_importJob_id_via_importStagedTransaction",
    }),
    transactionsImportJobId: r.many.transaction({
      alias: "transaction_importJobId_importJob_id",
    }),
  },
  investmentActivity: {
    financialAccount: r.one.financialAccount({
      from: r.investmentActivity.accountId,
      to: r.financialAccount.id,
    }),
    security: r.one.security({
      from: r.investmentActivity.securityId,
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
  messages: {
    users: r.many.user({
      from: r.messages.messageId.through(r.messageVotes.messageId),
      to: r.user.id.through(r.messageVotes.userId),
    }),
    chat: r.one.chats({
      from: r.messages.chatId,
      to: r.chats.chatId,
    }),
    parts: r.many.parts(),
  },
  mobileSubscription: {
    user: r.one.user({
      from: r.mobileSubscription.userId,
      to: r.user.id,
    }),
  },
  oauthAccessToken: {
    oauthClient: r.one.oauthClient({
      from: r.oauthAccessToken.clientId,
      to: r.oauthClient.clientId,
    }),
    oauthRefreshToken: r.one.oauthRefreshToken({
      from: r.oauthAccessToken.refreshId,
      to: r.oauthRefreshToken.id,
    }),
    session: r.one.session({
      from: r.oauthAccessToken.sessionId,
      to: r.session.id,
    }),
    user: r.one.user({
      from: r.oauthAccessToken.userId,
      to: r.user.id,
    }),
  },
  oauthClient: {
    oauthAccessTokens: r.many.oauthAccessToken(),
    user: r.one.user({
      from: r.oauthClient.userId,
      to: r.user.id,
      alias: "oauthClient_userId_user_id",
    }),
    users: r.many.user({
      from: r.oauthClient.clientId.through(r.oauthConsent.clientId),
      to: r.user.id.through(r.oauthConsent.userId),
      alias: "oauthClient_clientId_user_id_via_oauthConsent",
    }),
    oauthRefreshTokens: r.many.oauthRefreshToken(),
  },
  oauthRefreshToken: {
    oauthAccessTokens: r.many.oauthAccessToken(),
    oauthClient: r.one.oauthClient({
      from: r.oauthRefreshToken.clientId,
      to: r.oauthClient.clientId,
    }),
    session: r.one.session({
      from: r.oauthRefreshToken.sessionId,
      to: r.session.id,
    }),
    user: r.one.user({
      from: r.oauthRefreshToken.userId,
      to: r.user.id,
    }),
  },
  orders: {
    financialAccount: r.one.financialAccount({
      from: r.orders.accountId,
      to: r.financialAccount.id,
    }),
    security: r.one.security({
      from: r.orders.securityId,
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
    financialAccounts: r.many.financialAccount(),
    user: r.one.user({
      from: r.plaidConnection.userId,
      to: r.user.id,
    }),
  },
  recurring: {
    category: r.one.category({
      from: r.recurring.categoryId,
      to: r.category.id,
    }),
    financialAccount: r.one.financialAccount({
      from: r.recurring.accountId,
      to: r.financialAccount.id,
    }),
    user: r.one.user({
      from: r.recurring.userId,
      to: r.user.id,
    }),
  },
  security: {
    holdings: r.many.holding(),
    investmentActivities: r.many.investmentActivity(),
    orders: r.many.orders(),
  },
  session: {
    oauthAccessTokens: r.many.oauthAccessToken(),
    oauthRefreshTokens: r.many.oauthRefreshToken(),
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  snaptradeAuthorization: {
    financialAccounts: r.many.financialAccount(),
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
  tag: {
    user: r.one.user({
      from: r.tag.userId,
      to: r.user.id,
    }),
    transactions: r.many.transaction({
      from: r.tag.id.through(r.transactionTag.tagId),
      to: r.transaction.id.through(r.transactionTag.transactionId),
    }),
  },
  tickers: {
    fundamentals: r.many.fundamentals(),
  },
  transaction: {
    importJobs: r.many.importJob({
      from: r.transaction.id.through(r.importStagedTransaction.dedupeMatchId),
      to: r.importJob.id.through(r.importStagedTransaction.importJobId),
      alias: "transaction_id_importJob_id_via_importStagedTransaction",
    }),
    category: r.one.category({
      from: r.transaction.categoryId,
      to: r.category.id,
    }),
    importJob: r.one.importJob({
      from: r.transaction.importJobId,
      to: r.importJob.id,
      alias: "transaction_importJobId_importJob_id",
    }),
    financialAccount: r.one.financialAccount({
      from: r.transaction.accountId,
      to: r.financialAccount.id,
    }),
    user: r.one.user({
      from: r.transaction.userId,
      to: r.user.id,
      alias: "transaction_userId_user_id",
    }),
    users: r.many.user({
      from: r.transaction.id.through(r.transactionEdit.transactionId),
      to: r.user.id.through(r.transactionEdit.userId),
      alias: "transaction_id_user_id_via_transactionEdit",
    }),
    tags: r.many.tag(),
  },
  user: {
    accounts: r.many.account(),
    financialAccountsViaAccountMappingCache: r.many.financialAccount({
      alias: "financialAccount_id_user_id_via_accountMappingCache",
    }),
    apikeys: r.many.apikey(),
    financialAccountsViaBalance: r.many.financialAccount({
      alias: "financialAccount_id_user_id_via_balance",
    }),
    categoryGroupsViaCategory: r.many.categoryGroup({
      alias: "categoryGroup_id_user_id_via_category",
    }),
    categoryGroupsUserId: r.many.categoryGroup({
      alias: "categoryGroup_userId_user_id",
    }),
    categories: r.many.category(),
    chats: r.many.chats(),
    financialAccountsViaCreditLiability: r.many.financialAccount({
      alias: "financialAccount_id_user_id_via_creditLiability",
    }),
    csvColumnRoleCaches: r.many.csvColumnRoleCache(),
    csvMappingCaches: r.many.csvMappingCache(),
    feedbacks: r.many.feedback(),
    financialAccountsUserId: r.many.financialAccount({
      alias: "financialAccount_userId_user_id",
    }),
    financialGoals: r.many.financialGoals(),
    holdings: r.many.holding(),
    importJobs: r.many.importJob(),
    investmentActivities: r.many.investmentActivity(),
    kalshiUsers: r.many.kalshiUsers(),
    messages: r.many.messages(),
    mobileSubscriptions: r.many.mobileSubscription(),
    financialAccountsViaMortgageLiability: r.many.financialAccount({
      alias: "financialAccount_id_user_id_via_mortgageLiability",
    }),
    oauthAccessTokens: r.many.oauthAccessToken(),
    oauthClientsUserId: r.many.oauthClient({
      alias: "oauthClient_userId_user_id",
    }),
    oauthClientsViaOauthConsent: r.many.oauthClient({
      alias: "oauthClient_id_user_id_via_oauthConsent",
    }),
    oauthRefreshTokens: r.many.oauthRefreshToken(),
    orders: r.many.orders(),
    plaidConnections: r.many.plaidConnection(),
    recurrings: r.many.recurring(),
    sessions: r.many.session(),
    financialAccountsViaSnapshot: r.many.financialAccount({
      alias: "financialAccount_id_user_id_via_snapshot",
    }),
    snaptradeAuthorizations: r.many.snaptradeAuthorization(),
    snaptradeUsers: r.many.snaptradeUser(),
    financialAccountsViaStudentLoanLiability: r.many.financialAccount({
      alias: "financialAccount_id_user_id_via_studentLoanLiability",
    }),
    tags: r.many.tag(),
    transactionsUserId: r.many.transaction({
      alias: "transaction_userId_user_id",
    }),
    transactionsViaTransactionEdit: r.many.transaction({
      alias: "transaction_id_user_id_via_transactionEdit",
    }),
    userAlerts: r.many.userAlerts(),
  },
  userAlerts: {
    user: r.one.user({
      from: r.userAlerts.userId,
      to: r.user.id,
    }),
  },
}));
