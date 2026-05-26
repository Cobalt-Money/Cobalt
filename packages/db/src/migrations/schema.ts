import {
  pgEnum,
  pgTable,
  uuid,
  timestamp,
  text,
  jsonb,
  varchar,
  numeric,
  integer,
  date,
  boolean,
  bigint,
  doublePrecision,
  index,
  uniqueIndex,
  foreignKey,
  primaryKey,
  unique,
  check,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const feedbackType = pgEnum("feedback_type", ["general", "bug", "feature"]);
export const accountSource = pgEnum("account_source", ["plaid", "snaptrade", "manual"]);
export const activitySource = pgEnum("activity_source", ["plaid", "snaptrade", "manual"]);
export const securitySource = pgEnum("security_source", ["plaid", "snaptrade", "manual"]);
export const transactionSource = pgEnum("transaction_source", ["plaid", "manual"]);
export const transactionEditActor = pgEnum("transaction_edit_actor", ["system", "user"]);
export const importJobStatus = pgEnum("import_job_status", [
  "uploaded",
  "column_mapped",
  "account_mapped",
  "category_mapped",
  "committing",
  "committed",
  "failed",
  "cancelled",
]);
export const importSource = pgEnum("import_source", ["csv"]);

export const account = pgTable(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
    id: text().primaryKey(),
    idToken: text("id_token"),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text(),
    updatedAt: timestamp("updated_at").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("account_user_id_idx").using("btree", table.userId.asc().nullsLast())],
);

export const accountMappingCache = pgTable(
  "account_mapping_cache",
  {
    cobaltAccountId: uuid("cobalt_account_id").references(() => financialAccount.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    sourceLabel: text("source_label").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.sourceLabel], name: "account_mapping_cache_pkey" }),
  ],
);

export const apikey = pgTable(
  "apikey",
  {
    configId: text("config_id").default("default").notNull(),
    createdAt: timestamp("created_at").notNull(),
    enabled: boolean().default(true),
    expiresAt: timestamp("expires_at"),
    id: text().primaryKey(),
    key: text().notNull(),
    lastRefillAt: timestamp("last_refill_at"),
    lastRequest: timestamp("last_request"),
    metadata: text(),
    name: text(),
    permissions: text(),
    prefix: text(),
    rateLimitEnabled: boolean("rate_limit_enabled").default(true),
    rateLimitMax: integer("rate_limit_max").default(10_000),
    rateLimitTimeWindow: integer("rate_limit_time_window").default(86_400_000),
    referenceId: text("reference_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    refillAmount: integer("refill_amount"),
    refillInterval: integer("refill_interval"),
    remaining: integer(),
    requestCount: integer("request_count").default(0),
    start: text(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("apikey_config_id_idx").using("btree", table.configId.asc().nullsLast()),
    index("apikey_key_idx").using("btree", table.key.asc().nullsLast()),
    index("apikey_reference_id_idx").using("btree", table.referenceId.asc().nullsLast()),
  ],
);

export const balance = pgTable(
  "balance",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    available: numeric({ precision: 19, scale: 4 }),
    buyingPower: numeric("buying_power", { precision: 19, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    creditLimit: numeric("credit_limit", { precision: 19, scale: 4 }),
    currency: text(),
    current: numeric({ precision: 19, scale: 4 }).notNull(),
    id: uuid().defaultRandom().primaryKey(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userOverrideCreditLimit: numeric("user_override_credit_limit", { precision: 19, scale: 4 }),
  },
  (table) => [
    uniqueIndex("balance_account_id_unique").using("btree", table.accountId.asc().nullsLast()),
    index("balance_account_updated_idx").using(
      "btree",
      table.accountId.asc().nullsLast(),
      table.updatedAt.asc().nullsLast(),
    ),
    index("balance_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const category = pgTable(
  "category",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    excludeFromInsights: boolean("exclude_from_insights").default(false).notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => categoryGroup.id, { onDelete: "restrict" }),
    hidden: boolean().default(false).notNull(),
    iconKey: text("icon_key").notNull(),
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    order: integer().default(0).notNull(),
    systemKey: text("system_key"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("category_group_id_idx").using("btree", table.groupId.asc().nullsLast()),
    index("category_user_active_idx")
      .using("btree", table.userId.asc().nullsLast())
      .where(sql`(deleted_at IS NULL)`),
    index("category_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    uniqueIndex("category_user_system_key_idx")
      .using("btree", table.userId.asc().nullsLast(), table.systemKey.asc().nullsLast())
      .where(sql`(system_key IS NOT NULL)`),
  ],
);

export const categoryGroup = pgTable(
  "category_group",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    order: integer().default(0).notNull(),
    systemKey: text("system_key"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("category_group_user_active_idx")
      .using("btree", table.userId.asc().nullsLast())
      .where(sql`(deleted_at IS NULL)`),
    index("category_group_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    uniqueIndex("category_group_user_system_key_idx")
      .using("btree", table.userId.asc().nullsLast(), table.systemKey.asc().nullsLast())
      .where(sql`(system_key IS NOT NULL)`),
  ],
);

export const categoryMappingCache = pgTable(
  "category_mapping_cache",
  {
    action: text().notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    newName: text("new_name"),
    sourceLabel: text("source_label").notNull(),
    targetCategoryId: uuid("target_category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.sourceLabel], name: "category_mapping_cache_pkey" }),
  ],
);

export const chats = pgTable(
  "chats",
  {
    chatId: varchar("chat_id").primaryKey(),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    title: text(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("chats_chat_id_updated_at_idx").using(
      "btree",
      table.chatId.asc().nullsLast(),
      table.updatedAt.asc().nullsLast(),
    ),
    index("chats_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast()),
    index("chats_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const creditLiability = pgTable(
  "credit_liability",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    aprs: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    id: uuid().defaultRandom().primaryKey(),
    isOverdue: boolean("is_overdue").default(false).notNull(),
    lastPaymentAmount: numeric("last_payment_amount", { precision: 19, scale: 4 }),
    lastPaymentDate: date("last_payment_date"),
    lastStatementBalance: numeric("last_statement_balance", { precision: 19, scale: 4 }),
    lastStatementIssueDate: date("last_statement_issue_date"),
    minimumPaymentAmount: numeric("minimum_payment_amount", { precision: 19, scale: 4 }),
    nextPaymentDueDate: date("next_payment_due_date"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("credit_liability_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("credit_liability_v2_account_id_key").on(table.accountId),
  ],
);

export const csvColumnRoleCache = pgTable(
  "csv_column_role_cache",
  {
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    headerName: text("header_name").notNull(),
    meta: jsonb(),
    role: text().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.headerName], name: "csv_column_role_cache_pkey" }),
  ],
);

export const csvMappingCache = pgTable(
  "csv_mapping_cache",
  {
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    headerHash: text("header_hash").notNull(),
    mapping: jsonb().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.headerHash], name: "csv_mapping_cache_pkey" }),
  ],
);

export const eventArticles = pgTable(
  "event_articles",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    date: timestamp(),
    financialEventId: uuid("financial_event_id")
      .notNull()
      .references(() => financialEvents.id, { onDelete: "cascade" }),
    id: uuid().defaultRandom().primaryKey(),
    imageUrl: text("image_url"),
    newsUrl: text("news_url").notNull(),
    sentiment: varchar(),
    sourceName: varchar("source_name"),
    text: text(),
    tickers: jsonb(),
    title: text().notNull(),
    topics: jsonb(),
    type: varchar(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("event_articles_date_idx").using("btree", table.date.asc().nullsLast()),
    index("event_articles_financial_event_id_idx").using(
      "btree",
      table.financialEventId.asc().nullsLast(),
    ),
    index("event_articles_news_url_idx").using("btree", table.newsUrl.asc().nullsLast()),
    index("event_articles_source_name_idx").using("btree", table.sourceName.asc().nullsLast()),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    contactEmail: text("contact_email"),
    contactName: text("contact_name"),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    id: uuid().defaultRandom().primaryKey(),
    message: text().notNull(),
    subject: text().notNull(),
    type: feedbackType().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("feedback_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
    index("feedback_type_idx").using("btree", table.type.asc().nullsLast()),
    index("feedback_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const financialAccount = pgTable(
  "financial_account",
  {
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    csvCoverageThrough: date("csv_coverage_through"),
    customName: text("custom_name"),
    externalId: text("external_id"),
    id: uuid().defaultRandom().primaryKey(),
    institutionName: text("institution_name"),
    logoDomain: text("logo_domain"),
    mask: text(),
    name: text().notNull(),
    officialName: text("official_name"),
    persistentAccountId: text("persistent_account_id"),
    plaidConnectionId: uuid("plaid_connection_id").references(() => plaidConnection.id, {
      onDelete: "cascade",
    }),
    portfolioGroup: text("portfolio_group"),
    snaptradeAuthorizationId: uuid("snaptrade_authorization_id").references(
      () => snaptradeAuthorization.id,
      { onDelete: "cascade" },
    ),
    source: accountSource().notNull(),
    status: text(),
    subtype: text(),
    type: text().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("financial_account_persistent_id_idx").using(
      "btree",
      table.persistentAccountId.asc().nullsLast(),
    ),
    index("financial_account_plaid_connection_id_idx").using(
      "btree",
      table.plaidConnectionId.asc().nullsLast(),
    ),
    index("financial_account_snaptrade_auth_id_idx").using(
      "btree",
      table.snaptradeAuthorizationId.asc().nullsLast(),
    ),
    uniqueIndex("financial_account_source_external_id_idx")
      .using("btree", table.source.asc().nullsLast(), table.externalId.asc().nullsLast())
      .where(sql`(external_id IS NOT NULL)`),
    index("financial_account_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    index("financial_account_user_type_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.type.asc().nullsLast(),
    ),
    check(
      "financial_account_connection_arc",
      sql`(num_nonnulls(plaid_connection_id, snaptrade_authorization_id) <= 1)`,
    ),
  ],
);

export const financialEvents = pgTable(
  "financial_events",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    date: timestamp(),
    eventId: varchar("event_id").notNull(),
    eventName: text("event_name").notNull(),
    eventText: text("event_text"),
    id: uuid().defaultRandom().primaryKey(),
    keyPoints: jsonb("key_points"),
    newsItems: integer("news_items").default(0).notNull(),
    scrapedArticlesCount: integer("scraped_articles_count").default(0).notNull(),
    sentiment: varchar(),
    summary: text(),
    tickers: jsonb(),
    topics: jsonb().default(["other"]),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("financial_events_created_at_id_idx").using(
      "btree",
      table.createdAt.asc().nullsLast(),
      table.id.asc().nullsLast(),
    ),
    index("financial_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
    index("financial_events_date_id_idx").using(
      "btree",
      table.date.asc().nullsLast(),
      table.id.asc().nullsLast(),
    ),
    index("financial_events_date_idx").using("btree", table.date.asc().nullsLast()),
    index("financial_events_event_id_idx").using("btree", table.eventId.asc().nullsLast()),
    index("financial_events_sentiment_idx").using("btree", table.sentiment.asc().nullsLast()),
    index("financial_events_tickers_idx").using("gin", table.tickers.asc().nullsLast()),
    unique("financial_events_event_id_unique").on(table.eventId),
  ],
);

export const financialGoals = pgTable(
  "financial_goals",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    icon: varchar().default("target").notNull(),
    id: uuid().defaultRandom().primaryKey(),
    name: varchar().notNull(),
    targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
    targetDate: timestamp("target_date"),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("financial_goals_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
    index("financial_goals_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const fundamentals = pgTable("fundamentals", {
  analystBuy: integer("analyst_buy"),
  analystConsensus: text("analyst_consensus"),
  analystHold: integer("analyst_hold"),
  analystSell: integer("analyst_sell"),
  analystStrongBuy: integer("analyst_strong_buy"),
  analystStrongSell: integer("analyst_strong_sell"),
  analystSyncedAt: timestamp("analyst_synced_at", { withTimezone: true }),
  capex: bigint({ mode: "number" }),
  cash: bigint({ mode: "number" }),
  ceo: text(),
  companyName: text("company_name"),
  description: text(),
  employees: integer(),
  eps: numeric({ precision: 10, scale: 4 }),
  financialsSyncedAt: timestamp("financials_synced_at", { withTimezone: true }),
  fiscalYearEnd: date("fiscal_year_end"),
  grossProfit: bigint("gross_profit", { mode: "number" }),
  industry: text(),
  ipoDate: date("ipo_date"),
  longTermDebt: bigint("long_term_debt", { mode: "number" }),
  netIncome: bigint("net_income", { mode: "number" }),
  nextEarningsDate: date("next_earnings_date"),
  operatingCashFlow: bigint("operating_cash_flow", { mode: "number" }),
  operatingIncome: bigint("operating_income", { mode: "number" }),
  profileSyncedAt: timestamp("profile_synced_at", { withTimezone: true }),
  revenue: bigint({ mode: "number" }),
  sector: text(),
  sharesOutstandingDiluted: bigint("shares_outstanding_diluted", { mode: "number" }),
  sicCode: text("sic_code"),
  stockholdersEquity: bigint("stockholders_equity", { mode: "number" }),
  symbol: text()
    .primaryKey()
    .references(() => tickers.symbol, { onDelete: "cascade" }),
  totalAssets: bigint("total_assets", { mode: "number" }),
  totalLiabilities: bigint("total_liabilities", { mode: "number" }),
  website: text(),
});

export const holding = pgTable(
  "holding",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    averagePrice: numeric("average_price", { precision: 28, scale: 10 }),
    costBasis: numeric("cost_basis", { precision: 19, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    currency: text(),
    id: uuid().defaultRandom().primaryKey(),
    institutionPrice: numeric("institution_price", { precision: 28, scale: 10 }),
    institutionPriceAsOf: date("institution_price_as_of"),
    institutionPriceDatetime: timestamp("institution_price_datetime", { withTimezone: true }),
    institutionValue: numeric("institution_value", { precision: 19, scale: 4 }),
    isQuotable: boolean("is_quotable"),
    isTradable: boolean("is_tradable"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    openPnl: numeric("open_pnl", { precision: 19, scale: 4 }),
    quantity: numeric({ precision: 28, scale: 10 }).notNull(),
    securityId: uuid("security_id")
      .notNull()
      .references(() => security.id, { onDelete: "cascade" }),
    source: securitySource().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vestedQuantity: numeric("vested_quantity", { precision: 28, scale: 10 }),
    vestedValue: numeric("vested_value", { precision: 19, scale: 4 }),
  },
  (table) => [
    index("holding_account_id_idx").using("btree", table.accountId.asc().nullsLast()),
    uniqueIndex("holding_account_security_idx").using(
      "btree",
      table.accountId.asc().nullsLast(),
      table.securityId.asc().nullsLast(),
    ),
    index("holding_security_id_idx").using("btree", table.securityId.asc().nullsLast()),
    index("holding_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const importJob = pgTable(
  "import_job",
  {
    accountResolution: jsonb("account_resolution"),
    accountSuggestions: jsonb("account_suggestions"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    categoryResolution: jsonb("category_resolution"),
    categorySuggestions: jsonb("category_suggestions"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    errorMessage: text("error_message"),
    fileHash: text("file_hash"),
    fileKey: text("file_key"),
    headers: text().array().default([]).notNull(),
    id: uuid().defaultRandom().primaryKey(),
    originalFilename: text("original_filename"),
    progress: jsonb(),
    sampleRows: jsonb("sample_rows"),
    schemaConfirmedAt: timestamp("schema_confirmed_at", { withTimezone: true }),
    schemaMapping: jsonb("schema_mapping"),
    source: importSource().notNull(),
    status: importJobStatus().default("uploaded").notNull(),
    summary: jsonb(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workflowRunId: text("workflow_run_id"),
  },
  (table) => [
    index("import_job_user_file_hash_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.fileHash.asc().nullsLast(),
    ),
    index("import_job_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    index("import_job_user_status_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.status.asc().nullsLast(),
    ),
  ],
);

export const importStagedTransaction = pgTable(
  "import_staged_transaction",
  {
    amount: numeric({ precision: 19, scale: 4 }).notNull(),
    date: date().notNull(),
    dedupeMatchId: uuid("dedupe_match_id").references(() => transaction.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id"),
    id: uuid().defaultRandom().primaryKey(),
    importJobId: uuid("import_job_id")
      .notNull()
      .references(() => importJob.id, { onDelete: "cascade" }),
    isSplit: boolean("is_split").default(false).notNull(),
    isTransfer: boolean("is_transfer").default(false).notNull(),
    merchant: text().notNull(),
    notes: text(),
    originalDescription: text("original_description"),
    parseError: text("parse_error"),
    rawBlob: jsonb("raw_blob"),
    sourceAccountName: text("source_account_name").notNull(),
    sourceCategoryName: text("source_category_name"),
    tags: text().array(),
  },
  (table) => [
    index("import_staged_transaction_dedupe_match_idx").using(
      "btree",
      table.dedupeMatchId.asc().nullsLast(),
    ),
    index("import_staged_transaction_job_id_idx").using(
      "btree",
      table.importJobId.asc().nullsLast(),
    ),
  ],
);

export const institution = pgTable(
  "institution",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    id: uuid().defaultRandom().primaryKey(),
    logo: text(),
    name: text().notNull(),
    oauth: boolean().default(false).notNull(),
    plaidInstitutionId: text("plaid_institution_id").notNull(),
    primaryColor: text("primary_color"),
    routingNumbers: jsonb("routing_numbers"),
    status: text(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    url: text(),
  },
  (table) => [
    index("institution_name_idx").using("btree", table.name.asc().nullsLast()),
    index("institution_provider_id_idx").using("btree", table.plaidInstitutionId.asc().nullsLast()),
    unique("institution_plaid_institution_id_unique").on(table.plaidInstitutionId),
  ],
);

export const investmentActivity = pgTable(
  "investment_activity",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    amount: numeric({ precision: 19, scale: 4 }).notNull(),
    cancelTransactionId: text("cancel_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    currency: text(),
    date: date().notNull(),
    externalId: text("external_id"),
    externalReferenceId: text("external_reference_id"),
    fees: numeric({ precision: 19, scale: 4 }),
    fxRate: numeric("fx_rate", { precision: 19, scale: 8 }),
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    optionSymbol: text("option_symbol"),
    optionType: text("option_type"),
    price: numeric({ precision: 28, scale: 10 }),
    quantity: numeric({ precision: 28, scale: 10 }),
    securityId: uuid("security_id").references(() => security.id, { onDelete: "set null" }),
    settlementDate: date("settlement_date"),
    source: activitySource().notNull(),
    subtype: text(),
    type: text().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("investment_activity_account_date_idx").using(
      "btree",
      table.accountId.asc().nullsLast(),
      table.date.asc().nullsLast(),
    ),
    index("investment_activity_account_idx").using("btree", table.accountId.asc().nullsLast()),
    index("investment_activity_date_idx").using("btree", table.date.asc().nullsLast()),
    index("investment_activity_security_idx").using("btree", table.securityId.asc().nullsLast()),
    uniqueIndex("investment_activity_source_external_id_idx")
      .using("btree", table.source.asc().nullsLast(), table.externalId.asc().nullsLast())
      .where(sql`(external_id IS NOT NULL)`),
    index("investment_activity_type_idx").using("btree", table.type.asc().nullsLast()),
    index("investment_activity_user_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const jwks = pgTable("jwks", {
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { precision: 6, withTimezone: true }),
  id: text().primaryKey(),
  privateKey: text("private_key").notNull(),
  publicKey: text("public_key").notNull(),
});

export const kalshiUsers = pgTable(
  "kalshi_users",
  {
    apiKeyId: varchar("api_key_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
    lastVerifiedAt: timestamp("last_verified_at"),
    privateKeyPem: text("private_key_pem").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("kalshi_users_api_key_id_idx").using("btree", table.apiKeyId.asc().nullsLast()),
  ],
);

export const messageVotes = pgTable(
  "message_votes",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    id: uuid().defaultRandom().primaryKey(),
    messageId: varchar("message_id")
      .notNull()
      .references(() => messages.messageId, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vote: varchar().notNull(),
  },
  (table) => [
    index("message_votes_message_id_idx").using("btree", table.messageId.asc().nullsLast()),
    index("message_votes_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("message_votes_user_message_unique").on(table.userId, table.messageId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    chatId: varchar("chat_id")
      .notNull()
      .references(() => chats.chatId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    messageId: varchar("message_id").primaryKey(),
    role: varchar().notNull(),
  },
  (table) => [
    index("messages_chat_id_created_at_idx").using(
      "btree",
      table.chatId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),
    index("messages_chat_id_idx").using("btree", table.chatId.asc().nullsLast()),
  ],
);

export const mobileSubscription = pgTable(
  "mobile_subscription",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    environment: text().notNull(),
    expiresAt: timestamp("expires_at"),
    id: text().primaryKey(),
    latestTransactionId: text("latest_transaction_id"),
    originalTransactionId: text("original_transaction_id").notNull(),
    productId: text("product_id").notNull(),
    status: text().notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("mobile_subscription_original_transaction_id_idx").using(
      "btree",
      table.originalTransactionId.asc().nullsLast(),
    ),
    index("mobile_subscription_status_idx").using("btree", table.status.asc().nullsLast()),
    index("mobile_subscription_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("mobile_subscription_original_transaction_id_unique").on(table.originalTransactionId),
  ],
);

export const mortgageLiability = pgTable(
  "mortgage_liability",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    currentLateFee: numeric("current_late_fee", { precision: 19, scale: 4 }),
    escrowBalance: numeric("escrow_balance", { precision: 19, scale: 4 }),
    hasPmi: boolean("has_pmi"),
    hasPrepaymentPenalty: boolean("has_prepayment_penalty"),
    id: uuid().defaultRandom().primaryKey(),
    interestRate: jsonb("interest_rate"),
    lastPaymentAmount: numeric("last_payment_amount", { precision: 19, scale: 4 }),
    lastPaymentDate: date("last_payment_date"),
    loanTerm: text("loan_term"),
    loanTypeDescription: text("loan_type_description"),
    maturityDate: date("maturity_date"),
    nextMonthlyPayment: numeric("next_monthly_payment", { precision: 19, scale: 4 }),
    nextPaymentDueDate: date("next_payment_due_date"),
    originationDate: date("origination_date"),
    originationPrincipalAmount: numeric("origination_principal_amount", {
      precision: 19,
      scale: 4,
    }),
    pastDueAmount: numeric("past_due_amount", { precision: 19, scale: 4 }),
    propertyAddress: jsonb("property_address"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ytdInterestPaid: numeric("ytd_interest_paid", { precision: 19, scale: 4 }),
    ytdPrincipalPaid: numeric("ytd_principal_paid", { precision: 19, scale: 4 }),
  },
  (table) => [
    index("mortgage_liability_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("mortgage_liability_v2_account_id_key").on(table.accountId),
  ],
);

export const oauthAccessToken = pgTable(
  "oauth_access_token",
  {
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { precision: 6, withTimezone: true }).notNull(),
    id: text().primaryKey(),
    referenceId: text("reference_id"),
    refreshId: text("refresh_id").references(() => oauthRefreshToken.id, { onDelete: "cascade" }),
    scopes: text().array().notNull(),
    sessionId: text("session_id").references(() => session.id, { onDelete: "set null" }),
    token: varchar({ length: 255 }).notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("oauth_access_token_client_id_idx").using("btree", table.clientId.asc().nullsLast()),
    index("oauth_access_token_reference_id_idx").using(
      "btree",
      table.referenceId.asc().nullsLast(),
    ),
    index("oauth_access_token_refresh_id_idx").using("btree", table.refreshId.asc().nullsLast()),
    index("oauth_access_token_session_id_idx").using("btree", table.sessionId.asc().nullsLast()),
    index("oauth_access_token_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("oauth_access_token_token_key").on(table.token),
  ],
);

export const oauthClient = pgTable(
  "oauth_client",
  {
    clientId: varchar("client_id", { length: 255 }).notNull(),
    clientSecret: text("client_secret"),
    contacts: text().array(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }),
    disabled: boolean(),
    enableEndSession: boolean("enable_end_session"),
    grantTypes: text("grant_types").array(),
    icon: text(),
    id: text().primaryKey(),
    jwks: text(),
    jwksUri: text("jwks_uri"),
    metadata: jsonb(),
    name: text(),
    policy: text(),
    postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
    public: boolean(),
    redirectUris: text("redirect_uris").array().notNull(),
    referenceId: text("reference_id"),
    requirePkce: boolean("require_pkce"),
    responseTypes: text("response_types").array(),
    scopes: text().array(),
    skipConsent: boolean("skip_consent"),
    softwareId: text("software_id"),
    softwareStatement: text("software_statement"),
    softwareVersion: text("software_version"),
    subjectType: text("subject_type"),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
    tos: text(),
    type: text(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }),
    uri: text(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("oauth_client_client_id_idx").using("btree", table.clientId.asc().nullsLast()),
    index("oauth_client_reference_id_idx").using("btree", table.referenceId.asc().nullsLast()),
    index("oauth_client_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("oauth_client_client_id_key").on(table.clientId),
  ],
);

export const oauthConsent = pgTable(
  "oauth_consent",
  {
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
    id: text().primaryKey(),
    referenceId: text("reference_id"),
    scopes: text().array().notNull(),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("oauth_consent_client_user_idx").using(
      "btree",
      table.clientId.asc().nullsLast(),
      table.userId.asc().nullsLast(),
    ),
    index("oauth_consent_reference_id_idx").using("btree", table.referenceId.asc().nullsLast()),
  ],
);

export const oauthRefreshToken = pgTable(
  "oauth_refresh_token",
  {
    authTime: timestamp("auth_time", { precision: 6, withTimezone: true }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { precision: 6, withTimezone: true }).notNull(),
    id: text().primaryKey(),
    referenceId: text("reference_id"),
    revoked: timestamp({ precision: 6, withTimezone: true }),
    scopes: text().array().notNull(),
    sessionId: text("session_id").references(() => session.id, { onDelete: "set null" }),
    token: text().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("oauth_refresh_token_client_id_idx").using("btree", table.clientId.asc().nullsLast()),
    index("oauth_refresh_token_reference_id_idx").using(
      "btree",
      table.referenceId.asc().nullsLast(),
    ),
    index("oauth_refresh_token_session_id_idx").using("btree", table.sessionId.asc().nullsLast()),
    index("oauth_refresh_token_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const orders = pgTable(
  "orders",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    action: text(),
    canceledQuantity: numeric("canceled_quantity", { precision: 28, scale: 10 }),
    childBrokerageOrderIds: jsonb("child_brokerage_order_ids"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    currency: text(),
    executionPrice: numeric("execution_price", { precision: 28, scale: 10 }),
    expirationDate: timestamp("expiration_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    externalId: text("external_id").notNull(),
    filledQuantity: numeric("filled_quantity", { precision: 28, scale: 10 }),
    id: uuid().defaultRandom().primaryKey(),
    isMiniOption: boolean("is_mini_option"),
    limitPrice: numeric("limit_price", { precision: 28, scale: 10 }),
    openQuantity: numeric("open_quantity", { precision: 28, scale: 10 }),
    optionSymbol: jsonb("option_symbol"),
    optionType: text("option_type"),
    orderType: text("order_type"),
    securityId: uuid("security_id").references(() => security.id, { onDelete: "set null" }),
    status: text(),
    stopPrice: numeric("stop_price", { precision: 28, scale: 10 }),
    strikePrice: numeric("strike_price", { precision: 28, scale: 10 }),
    timeExecuted: timestamp("time_executed", { withTimezone: true }),
    timeInForce: text("time_in_force"),
    timePlaced: timestamp("time_placed", { withTimezone: true }),
    timeUpdated: timestamp("time_updated", { withTimezone: true }),
    totalQuantity: numeric("total_quantity", { precision: 28, scale: 10 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("orders_account_id_idx").using("btree", table.accountId.asc().nullsLast()),
    index("orders_security_id_idx").using("btree", table.securityId.asc().nullsLast()),
    index("orders_status_idx").using("btree", table.status.asc().nullsLast()),
    index("orders_time_placed_idx").using("btree", table.timePlaced.asc().nullsLast()),
    index("orders_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("orders_external_id_key").on(table.externalId),
  ],
);

export const parts = pgTable(
  "parts",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    data: jsonb(),
    fileFilename: varchar("file_filename"),
    fileMediaType: varchar("file_media_type"),
    fileUrl: varchar("file_url"),
    messageId: varchar("message_id")
      .notNull()
      .references(() => messages.messageId, { onDelete: "cascade" }),
    order: integer().default(0).notNull(),
    partId: varchar("part_id").primaryKey(),
    providerMetadata: jsonb("provider_metadata"),
    reasoningText: text("reasoning_text"),
    sourceDocumentFilename: varchar("source_document_filename"),
    sourceDocumentMediaType: varchar("source_document_media_type"),
    sourceDocumentSourceId: varchar("source_document_source_id"),
    sourceDocumentTitle: varchar("source_document_title"),
    sourceUrlSourceId: varchar("source_url_source_id"),
    sourceUrlTitle: varchar("source_url_title"),
    sourceUrlUrl: varchar("source_url_url"),
    textText: text("text_text"),
    toolCallId: varchar("tool_call_id"),
    toolErrorText: varchar("tool_error_text"),
    toolInput: jsonb("tool_input"),
    toolOutput: jsonb("tool_output"),
    toolState: varchar("tool_state"),
    type: varchar().notNull(),
  },
  (table) => [
    index("parts_message_id_idx").using("btree", table.messageId.asc().nullsLast()),
    index("parts_message_id_order_idx").using(
      "btree",
      table.messageId.asc().nullsLast(),
      table.order.asc().nullsLast(),
    ),
    check(
      "file_fields_required_if_type_is_file",
      sql`
CASE
    WHEN ((type)::text = 'file'::text) THEN ((file_media_type IS NOT NULL) AND (file_url IS NOT NULL))
    ELSE true
END`,
    ),
    check(
      "reasoning_text_required_if_type_is_reasoning",
      sql`
CASE
    WHEN ((type)::text = 'reasoning'::text) THEN (reasoning_text IS NOT NULL)
    ELSE true
END`,
    ),
    check(
      "source_document_fields_required_if_type_is_source_document",
      sql`
CASE
    WHEN ((type)::text = 'source_document'::text) THEN ((source_document_source_id IS NOT NULL) AND (source_document_media_type IS NOT NULL) AND (source_document_title IS NOT NULL))
    ELSE true
END`,
    ),
    check(
      "source_url_fields_required_if_type_is_source_url",
      sql`
CASE
    WHEN ((type)::text = 'source_url'::text) THEN ((source_url_source_id IS NOT NULL) AND (source_url_url IS NOT NULL))
    ELSE true
END`,
    ),
    check(
      "text_text_required_if_type_is_text",
      sql`
CASE
    WHEN ((type)::text = 'text'::text) THEN (text_text IS NOT NULL)
    ELSE true
END`,
    ),
  ],
);

export const plaidConnection = pgTable(
  "plaid_connection",
  {
    availableProducts: jsonb("available_products"),
    billedProducts: jsonb("billed_products"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    error: jsonb(),
    id: uuid().defaultRandom().primaryKey(),
    institutionId: text("institution_id"),
    institutionLogo: text("institution_logo"),
    institutionName: text("institution_name"),
    newAccountsAvailable: boolean("new_accounts_available").default(false).notNull(),
    pendingDisconnectAt: timestamp("pending_disconnect_at", { withTimezone: true }),
    plaidAccessToken: text("plaid_access_token").notNull(),
    plaidItemId: text("plaid_item_id").notNull(),
    recurringUpdatedDatetime: timestamp("recurring_updated_datetime", { withTimezone: true }),
    transactionsCursor: text("transactions_cursor"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    webhookUrl: text("webhook_url"),
  },
  (table) => [
    index("plaid_connection_institution_id_idx").using(
      "btree",
      table.institutionId.asc().nullsLast(),
    ),
    index("plaid_connection_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    index("plaid_connection_user_institution_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.institutionId.asc().nullsLast(),
    ),
    unique("plaid_connection_plaid_item_id_key").on(table.plaidItemId),
  ],
);

export const recurring = pgTable(
  "recurring",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    averageAmount: numeric("average_amount", { precision: 19, scale: 4 }).notNull(),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    description: text().notNull(),
    externalId: text("external_id"),
    firstDate: date("first_date").notNull(),
    frequency: text().notNull(),
    id: uuid().defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    lastAmount: numeric("last_amount", { precision: 19, scale: 4 }).notNull(),
    lastDate: date("last_date").notNull(),
    merchantName: text("merchant_name"),
    predictedNextDate: date("predicted_next_date"),
    source: transactionSource().notNull(),
    status: text().notNull(),
    streamType: text("stream_type").notNull(),
    transactionIds: jsonb("transaction_ids").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("recurring_account_date_type_idx").using(
      "btree",
      table.accountId.asc().nullsLast(),
      table.lastDate.asc().nullsLast(),
      table.streamType.asc().nullsLast(),
    ),
    index("recurring_account_id_idx").using("btree", table.accountId.asc().nullsLast()),
    index("recurring_category_id_idx").using("btree", table.categoryId.asc().nullsLast()),
    uniqueIndex("recurring_source_external_id_idx")
      .using("btree", table.source.asc().nullsLast(), table.externalId.asc().nullsLast())
      .where(sql`(external_id IS NOT NULL)`),
    index("recurring_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const rssArticles = pgTable(
  "rss_articles",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    description: text(),
    feedIds: jsonb("feed_ids").notNull(),
    id: uuid().defaultRandom().primaryKey(),
    link: text().notNull(),
    metadata: jsonb(),
    publishedDate: timestamp("published_date"),
    title: text().notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("rss_articles_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
    index("rss_articles_link_where_idx").using("btree", table.link.asc().nullsLast()),
    index("rss_articles_published_date_idx").using("btree", table.publishedDate.asc().nullsLast()),
    unique("rss_articles_link_unique").on(table.link),
  ],
);

export const rssFeeds = pgTable(
  "rss_feeds",
  {
    category: text().notNull(),
    company: text().notNull(),
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    description: text(),
    fetchIntervalMinutes: varchar("fetch_interval_minutes").default("5"),
    id: uuid().defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    lastFetched: timestamp("last_fetched"),
    name: text().notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    url: text().notNull(),
  },
  (table) => [
    index("rss_feeds_category_idx").using("btree", table.category.asc().nullsLast()),
    index("rss_feeds_company_category_idx").using(
      "btree",
      table.company.asc().nullsLast(),
      table.category.asc().nullsLast(),
    ),
    index("rss_feeds_company_idx").using("btree", table.company.asc().nullsLast()),
    index("rss_feeds_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
    index("rss_feeds_last_fetched_idx").using("btree", table.lastFetched.asc().nullsLast()),
    index("rss_feeds_url_idx").using("btree", table.url.asc().nullsLast()),
    unique("rss_feeds_url_unique").on(table.url),
  ],
);

export const security = pgTable(
  "security",
  {
    closePrice: numeric("close_price", { precision: 28, scale: 10 }),
    closePriceAsOf: date("close_price_as_of"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    currency: text(),
    cusip: text(),
    exchangeCode: text("exchange_code"),
    exchangeName: text("exchange_name"),
    externalId: text("external_id"),
    figiCode: text("figi_code"),
    fixedIncome: jsonb("fixed_income"),
    id: uuid().defaultRandom().primaryKey(),
    industry: text(),
    institutionId: text("institution_id"),
    institutionSecurityId: text("institution_security_id"),
    isCashEquivalent: boolean("is_cash_equivalent"),
    isin: text(),
    marketIdentifierCode: text("market_identifier_code"),
    name: text(),
    optionContract: jsonb("option_contract"),
    proxySecurityId: text("proxy_security_id"),
    sector: text(),
    sedol: text(),
    source: securitySource().notNull(),
    subtype: text(),
    tickerSymbol: text("ticker_symbol"),
    type: text(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("security_cusip_idx").using("btree", table.cusip.asc().nullsLast()),
    index("security_figi_idx").using("btree", table.figiCode.asc().nullsLast()),
    index("security_sector_idx").using("btree", table.sector.asc().nullsLast()),
    uniqueIndex("security_source_external_id_idx")
      .using("btree", table.source.asc().nullsLast(), table.externalId.asc().nullsLast())
      .where(sql`(external_id IS NOT NULL)`),
    index("security_ticker_idx").using("btree", table.tickerSymbol.asc().nullsLast()),
    index("security_type_idx").using("btree", table.type.asc().nullsLast()),
  ],
);

export const session = pgTable(
  "session",
  {
    createdAt: timestamp("created_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text().primaryKey(),
    ipAddress: text("ip_address"),
    token: text().notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("session_token_unique").on(table.token),
  ],
);

export const snapshot = pgTable(
  "snapshot",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    available: numeric({ precision: 19, scale: 4 }),
    buyingPower: numeric("buying_power", { precision: 19, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    creditLimit: numeric("credit_limit", { precision: 19, scale: 4 }),
    currency: text(),
    current: numeric({ precision: 19, scale: 4 }).notNull(),
    id: uuid().defaultRandom().primaryKey(),
    positionsCount: integer("positions_count"),
    positionsValue: numeric("positions_value", { precision: 19, scale: 4 }),
    snapshotDate: date("snapshot_date").notNull(),
    source: accountSource(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("snapshot_account_date_idx").using(
      "btree",
      table.accountId.asc().nullsLast(),
      table.snapshotDate.asc().nullsLast(),
    ),
    index("snapshot_account_id_idx").using("btree", table.accountId.asc().nullsLast()),
    index("snapshot_date_idx").using("btree", table.snapshotDate.asc().nullsLast()),
    index("snapshot_user_id_idx").using("btree", table.userId.asc().nullsLast()),
  ],
);

export const snaptradeAuthorization = pgTable(
  "snaptrade_authorization",
  {
    authorizationId: text("authorization_id").notNull(),
    brokerage: text().notNull(),
    brokerageSlug: text("brokerage_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    id: uuid().defaultRandom().primaryKey(),
    isDisabled: boolean("is_disabled").default(false).notNull(),
    isEligibleForPayout: boolean("is_eligible_for_payout").default(false).notNull(),
    meta: jsonb(),
    name: text().notNull(),
    type: text(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("snaptrade_auth_brokerage_slug_idx").using(
      "btree",
      table.brokerageSlug.asc().nullsLast(),
    ),
    index("snaptrade_auth_is_disabled_idx").using("btree", table.isDisabled.asc().nullsLast()),
    index("snaptrade_auth_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("snaptrade_authorization_authorization_id_key").on(table.authorizationId),
  ],
);

export const snaptradeUser = pgTable(
  "snaptrade_user",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    snaptradeUserId: text("snaptrade_user_id").notNull(),
    snaptradeUserSecret: text("snaptrade_user_secret").notNull(),
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("snaptrade_user_snaptrade_user_id_idx").using(
      "btree",
      table.snaptradeUserId.asc().nullsLast(),
    ),
    unique("snaptrade_user_snaptrade_user_id_key").on(table.snaptradeUserId),
  ],
);

export const studentLoanLiability = pgTable(
  "student_loan_liability",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    disbursementDates: jsonb("disbursement_dates"),
    expectedPayoffDate: date("expected_payoff_date"),
    guarantor: text(),
    id: uuid().defaultRandom().primaryKey(),
    interestRatePercentage: numeric("interest_rate_percentage", { precision: 9, scale: 6 }),
    isOverdue: boolean("is_overdue"),
    lastPaymentAmount: numeric("last_payment_amount", { precision: 19, scale: 4 }),
    lastPaymentDate: date("last_payment_date"),
    lastStatementBalance: numeric("last_statement_balance", { precision: 19, scale: 4 }),
    lastStatementIssueDate: date("last_statement_issue_date"),
    loanName: text("loan_name"),
    loanStatus: jsonb("loan_status"),
    minimumPaymentAmount: numeric("minimum_payment_amount", { precision: 19, scale: 4 }),
    nextPaymentDueDate: date("next_payment_due_date"),
    originationDate: date("origination_date"),
    originationPrincipalAmount: numeric("origination_principal_amount", {
      precision: 19,
      scale: 4,
    }),
    outstandingInterestAmount: numeric("outstanding_interest_amount", { precision: 19, scale: 4 }),
    paymentReferenceNumber: text("payment_reference_number"),
    pslfStatus: jsonb("pslf_status"),
    repaymentPlan: jsonb("repayment_plan"),
    sequenceNumber: text("sequence_number"),
    servicerAddress: jsonb("servicer_address"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ytdInterestPaid: numeric("ytd_interest_paid", { precision: 19, scale: 4 }),
    ytdPrincipalPaid: numeric("ytd_principal_paid", { precision: 19, scale: 4 }),
  },
  (table) => [
    index("student_loan_liability_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    unique("student_loan_liability_v2_account_id_key").on(table.accountId),
  ],
);

export const subscription = pgTable(
  "subscription",
  {
    billingInterval: text("billing_interval"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end"),
    id: text().primaryKey(),
    periodEnd: timestamp("period_end"),
    periodStart: timestamp("period_start"),
    plan: text().notNull(),
    referenceId: text("reference_id").notNull(),
    seats: integer(),
    status: text().notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    trialEnd: timestamp("trial_end"),
    trialStart: timestamp("trial_start"),
  },
  (table) => [
    index("subscription_reference_id_idx").using("btree", table.referenceId.asc().nullsLast()),
    index("subscription_stripe_customer_id_idx").using(
      "btree",
      table.stripeCustomerId.asc().nullsLast(),
    ),
    index("subscription_stripe_subscription_id_idx").using(
      "btree",
      table.stripeSubscriptionId.asc().nullsLast(),
    ),
  ],
);

export const tag = pgTable(
  "tag",
  {
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    color: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("tag_user_id_active_idx")
      .using("btree", table.userId.asc().nullsLast())
      .where(sql`(archived_at IS NULL)`),
    uniqueIndex("tag_user_id_lower_name_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      sql`lower(name)`,
    ),
    check(
      "tag_color_check",
      sql`(color = ANY (ARRAY['red'::text, 'orange'::text, 'amber'::text, 'yellow'::text, 'lime'::text, 'green'::text, 'teal'::text, 'cyan'::text, 'blue'::text, 'indigo'::text, 'violet'::text, 'purple'::text, 'pink'::text, 'rose'::text, 'slate'::text, 'stone'::text]))`,
    ),
    check("tag_name_length_check", sql`(length(name) <= 50)`),
  ],
);

export const tickers = pgTable(
  "tickers",
  {
    cik: text(),
    country: text(),
    currency: text(),
    exchange: text().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    name: text().notNull(),
    symbol: text().primaryKey(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    type: text().notNull(),
  },
  (table) => [
    index("tickers_cik_idx").using("btree", table.cik.asc().nullsLast()),
    index("tickers_exchange_idx").using("btree", table.exchange.asc().nullsLast()),
    index("tickers_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
  ],
);

export const transaction = pgTable(
  "transaction",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    accountOwner: text("account_owner"),
    address: text(),
    amount: numeric({ precision: 19, scale: 4 }).notNull(),
    authorizedDate: date("authorized_date"),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "restrict" }),
    checkNumber: text("check_number"),
    city: text(),
    counterparties: jsonb(),
    country: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    currency: text(),
    date: date().notNull(),
    excluded: boolean().default(false).notNull(),
    externalId: text("external_id"),
    id: uuid().defaultRandom().primaryKey(),
    importHash: text("import_hash"),
    importJobId: uuid("import_job_id").references(() => importJob.id, { onDelete: "set null" }),
    lat: doublePrecision(),
    lockedFields: jsonb("locked_fields").default([]).notNull(),
    logoUrl: text("logo_url"),
    lon: doublePrecision(),
    merchantEntityId: text("merchant_entity_id"),
    merchantName: text("merchant_name"),
    name: text().notNull(),
    notes: text(),
    paymentChannel: text("payment_channel"),
    pending: boolean().default(false).notNull(),
    pendingTransactionId: text("pending_transaction_id"),
    postalCode: text("postal_code"),
    region: text(),
    source: transactionSource().notNull(),
    storeNumber: text("store_number"),
    transactionCode: text("transaction_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    website: text(),
  },
  (table) => [
    index("transaction_account_date_idx").using(
      "btree",
      table.accountId.asc().nullsLast(),
      table.date.asc().nullsLast(),
    ),
    index("transaction_account_id_idx").using("btree", table.accountId.asc().nullsLast()),
    index("transaction_category_id_idx").using("btree", table.categoryId.asc().nullsLast()),
    index("transaction_date_idx").using("btree", table.date.asc().nullsLast()),
    index("transaction_date_pending_idx").using(
      "btree",
      table.date.asc().nullsLast(),
      table.pending.asc().nullsLast(),
    ),
    index("transaction_import_job_id_idx").using("btree", table.importJobId.asc().nullsLast()),
    index("transaction_pending_idx").using("btree", table.pending.asc().nullsLast()),
    uniqueIndex("transaction_source_external_id_idx")
      .using("btree", table.source.asc().nullsLast(), table.externalId.asc().nullsLast())
      .where(sql`(external_id IS NOT NULL)`),
    index("transaction_user_id_idx").using("btree", table.userId.asc().nullsLast()),
    uniqueIndex("transaction_user_import_hash_idx")
      .using("btree", table.userId.asc().nullsLast(), table.importHash.asc().nullsLast())
      .where(sql`(import_hash IS NOT NULL)`),
  ],
);

export const transactionEdit = pgTable(
  "transaction_edit",
  {
    actor: transactionEditActor().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    field: text().notNull(),
    id: uuid().defaultRandom().primaryKey(),
    newValue: jsonb("new_value"),
    oldValue: jsonb("old_value"),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("transaction_edit_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
    index("transaction_edit_transaction_id_idx").using(
      "btree",
      table.transactionId.asc().nullsLast(),
    ),
  ],
);

export const transactionTag = pgTable(
  "transaction_tag",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.transactionId, table.tagId], name: "transaction_tag_pkey" }),
    index("transaction_tag_tag_id_idx").using("btree", table.tagId.asc().nullsLast()),
  ],
);

export const user = pgTable(
  "user",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    email: text(),
    emailVerified: boolean("email_verified").notNull(),
    id: text().primaryKey(),
    image: text(),
    isAnonymous: boolean("is_anonymous"),
    lastSeenAt: timestamp("last_seen_at"),
    name: text().notNull(),
    onboardedAt: timestamp("onboarded_at"),
    onboardingStep: text("onboarding_step"),
    stripeCustomerId: text("stripe_customer_id"),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("user_email_idx").using("btree", table.email.asc().nullsLast()),
    unique("user_email_unique").on(table.email),
    unique("user_stripe_customer_id_unique").on(table.stripeCustomerId),
  ],
);

export const userAlerts = pgTable(
  "user_alerts",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    id: uuid().defaultRandom().primaryKey(),
    metadata: jsonb(),
    resolvedAt: timestamp("resolved_at"),
    source: text().notNull(),
    sourceId: text("source_id"),
    type: text().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("user_alerts_active_idx").using(
      "btree",
      table.userId.asc().nullsLast(),
      table.resolvedAt.asc().nullsLast(),
    ),
    uniqueIndex("user_alerts_dedup_idx")
      .using(
        "btree",
        table.source.asc().nullsLast(),
        table.sourceId.asc().nullsLast(),
        table.type.asc().nullsLast(),
      )
      .where(sql`(resolved_at IS NULL)`),
    index("user_alerts_source_idx").using(
      "btree",
      table.source.asc().nullsLast(),
      table.sourceId.asc().nullsLast(),
    ),
  ],
);

export const verification = pgTable(
  "verification",
  {
    createdAt: timestamp("created_at")
      .default(sql`now()`)
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text().primaryKey(),
    identifier: text().notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`now()`)
      .notNull(),
    value: text().notNull(),
  },
  (table) => [
    index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast()),
  ],
);
