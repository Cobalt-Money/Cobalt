import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable(
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
  (table) => [index("user_email_idx").on(table.email)]
);

export const session = pgTable(
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
  (table) => [index("session_user_id_idx").on(table.userId)]
);

export const account = pgTable(
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
  (table) => [index("account_user_id_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    value: text("value").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

/** OAuth 2.1 provider + JWT plugin tables for Better Auth. */
export const oauthClient = pgTable(
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
  ]
);

export const oauthRefreshToken = pgTable(
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
  ]
);

export const oauthAccessToken = pgTable(
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
  ]
);

export const oauthConsent = pgTable(
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
  ]
);

export const jwks = pgTable(
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
  () => []
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
