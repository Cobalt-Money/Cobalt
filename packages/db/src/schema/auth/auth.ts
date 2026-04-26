import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { appFullAccess, agentSelectOwn } from "../rls";

export const user = pgTable.withRLS(
  "user",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email").unique(),
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    id: text("id").primaryKey(),
    image: text("image"),
    lastSeenAt: timestamp("last_seen_at"),
    name: text("name").notNull(),
    stripeCustomerId: text("stripe_customer_id").unique(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_email_idx").on(table.email),
    appFullAccess(),
    agentSelectOwn("id"),
  ]
);

export const session = pgTable.withRLS(
  "session",
  {
    createdAt: timestamp("created_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    ipAddress: text("ip_address"),
    token: text("token").notNull().unique(),
    updatedAt: timestamp("updated_at").notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

export const account = pgTable.withRLS(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
    id: text("id").primaryKey(),
    idToken: text("id_token"),
    // No `password` column — social-only auth (matches horizon-test auth-schema)
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    updatedAt: timestamp("updated_at").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

export const verification = pgTable.withRLS(
  "verification",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    value: text("value").notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    appFullAccess(),
  ]
);

/** OAuth 2.1 provider + JWT plugin tables for Better Auth. */
export const oauthClient = pgTable.withRLS(
  "oauth_client",
  {
    clientId: varchar("client_id", { length: 255 }).notNull().unique(),
    clientSecret: text("client_secret"),
    contacts: text("contacts").array(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }),
    disabled: boolean("disabled"),
    enableEndSession: boolean("enable_end_session"),
    grantTypes: text("grant_types").array(),
    icon: text("icon"),
    id: text("id").primaryKey(),
    metadata: jsonb("metadata"),
    name: text("name"),
    policy: text("policy"),
    postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
    public: boolean("public"),
    redirectUris: text("redirect_uris").array().notNull(),
    referenceId: text("reference_id"),
    requirePKCE: boolean("require_pkce"),
    responseTypes: text("response_types").array(),
    scopes: text("scopes").array(),
    skipConsent: boolean("skip_consent"),
    softwareId: text("software_id"),
    softwareStatement: text("software_statement"),
    softwareVersion: text("software_version"),
    subjectType: text("subject_type"),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
    tos: text("tos"),
    type: text("type"),
    updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }),
    uri: text("uri"),
    userId: text("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    index("oauth_client_user_id_idx").on(table.userId),
    index("oauth_client_client_id_idx").on(table.clientId),
    index("oauth_client_reference_id_idx").on(table.referenceId),
    appFullAccess(),
  ]
);

export const oauthRefreshToken = pgTable.withRLS(
  "oauth_refresh_token",
  {
    authTime: timestamp("auth_time", { precision: 6, withTimezone: true }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    expiresAt: timestamp("expires_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    id: text("id").primaryKey(),
    referenceId: text("reference_id"),
    revoked: timestamp("revoked", { precision: 6, withTimezone: true }),
    scopes: text("scopes").array().notNull(),
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    token: text("token").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("oauth_refresh_token_client_id_idx").on(table.clientId),
    index("oauth_refresh_token_user_id_idx").on(table.userId),
    index("oauth_refresh_token_reference_id_idx").on(table.referenceId),
    index("oauth_refresh_token_session_id_idx").on(table.sessionId),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

export const oauthAccessToken = pgTable.withRLS(
  "oauth_access_token",
  {
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    expiresAt: timestamp("expires_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    id: text("id").primaryKey(),
    referenceId: text("reference_id"),
    refreshId: text("refresh_id").references(() => oauthRefreshToken.id, {
      onDelete: "cascade",
    }),
    scopes: text("scopes").array().notNull(),
    sessionId: text("session_id").references(() => session.id, {
      onDelete: "set null",
    }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    index("oauth_access_token_client_id_idx").on(table.clientId),
    index("oauth_access_token_user_id_idx").on(table.userId),
    index("oauth_access_token_reference_id_idx").on(table.referenceId),
    index("oauth_access_token_refresh_id_idx").on(table.refreshId),
    index("oauth_access_token_session_id_idx").on(table.sessionId),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

export const oauthConsent = pgTable.withRLS(
  "oauth_consent",
  {
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    id: text("id").primaryKey(),
    referenceId: text("reference_id"),
    scopes: text("scopes").array().notNull(),
    updatedAt: timestamp("updated_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("oauth_consent_client_user_idx").on(table.clientId, table.userId),
    index("oauth_consent_reference_id_idx").on(table.referenceId),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

export const jwks = pgTable.withRLS(
  "jwks",
  {
    createdAt: timestamp("created_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    expiresAt: timestamp("expires_at", { precision: 6, withTimezone: true }),
    id: text("id").primaryKey(),
    privateKey: text("private_key").notNull(),
    publicKey: text("public_key").notNull(),
  },
  () => [appFullAccess()]
);

export const subscription = pgTable.withRLS(
  "subscription",
  {
    billingInterval: text("billing_interval"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").$defaultFn(() => false),
    id: text("id").primaryKey(),
    periodEnd: timestamp("period_end"),
    periodStart: timestamp("period_start"),
    plan: text("plan").notNull(),
    referenceId: text("reference_id").notNull(),
    seats: integer("seats"),
    status: text("status")
      .notNull()
      .$defaultFn(() => "incomplete"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    trialEnd: timestamp("trial_end"),
    trialStart: timestamp("trial_start"),
  },
  (table) => [
    index("subscription_reference_id_idx").on(table.referenceId),
    index("subscription_stripe_customer_id_idx").on(table.stripeCustomerId),
    index("subscription_stripe_subscription_id_idx").on(
      table.stripeSubscriptionId
    ),
    appFullAccess(),
    agentSelectOwn("reference_id"),
  ]
);

// Type exports
export type User = typeof user.$inferSelect;
export type UserInsert = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type SessionInsert = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type AccountInsert = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type VerificationInsert = typeof verification.$inferInsert;
export type Subscription = typeof subscription.$inferSelect;
export type SubscriptionInsert = typeof subscription.$inferInsert;
export type OAuthClient = typeof oauthClient.$inferSelect;
export type OAuthClientInsert = typeof oauthClient.$inferInsert;
export type OAuthRefreshToken = typeof oauthRefreshToken.$inferSelect;
export type OAuthRefreshTokenInsert = typeof oauthRefreshToken.$inferInsert;
export type OauthAccessToken = typeof oauthAccessToken.$inferSelect;
export type OauthAccessTokenInsert = typeof oauthAccessToken.$inferInsert;
export type OauthConsent = typeof oauthConsent.$inferSelect;
export type OauthConsentInsert = typeof oauthConsent.$inferInsert;
export type Jwks = typeof jwks.$inferSelect;
export type JwksInsert = typeof jwks.$inferInsert;
