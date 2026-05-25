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
    /**
     * Better Auth anonymous plugin marker. Set by signInAnonymous when minting
     * a demo session. Demo gating + cleanup cron read this flag — there is no
     * separate `isDemo` because every anonymous user in this app is a demo.
     */
    isAnonymous: boolean("is_anonymous"),
    lastSeenAt: timestamp("last_seen_at"),
    name: text("name").notNull(),
    onboardedAt: timestamp("onboarded_at"),
    onboardingStep: text("onboarding_step"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)],
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
  (table) => [index("session_user_id_idx").on(table.userId)],
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
  (table) => [index("account_user_id_idx").on(table.userId)],
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
  (table) => [index("verification_identifier_idx").on(table.identifier)],
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
    // Better Auth 1.7+: optional JWKS for OAuth clients authenticating via
    // `private_key_jwt`. NULL for the common public-PKCE MCP path
    // (Cursor / Claude Code / Raycast / Zed) — populated only when an
    // enterprise client registers with a signed JWT auth method.
    jwks: text("jwks"),
    jwksUri: text("jwks_uri"),
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
  ],
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
  ],
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
  ],
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
  ],
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
  () => [],
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

/**
 * Better Auth `apiKey` plugin table. Mirrors the shape emitted by
 * `bunx @better-auth/cli generate` for plugin v1.7.0-beta.3 — keep in sync
 * if the plugin bumps.
 *
 * Backs `POST /api/auth/api-key/*` (web-issued `ck_live_…` bearers used by
 * /v1/* SDK consumers) and the per-key rate-limit counters when
 * `storage: "secondary-storage"` misses Redis (`fallbackToDatabase: true`
 * in packages/auth/src/index.ts).
 *
 * Cobalt-specific tweaks over the CLI output:
 *   - `referenceId` keeps an FK to `user(id)` with cascade — the CLI omits
 *     it, but we want orphan keys impossible if a user is deleted.
 *   - Index names use snake_case to match existing auth tables (CLI emits
 *     camelCase).
 *
 * Defaults (enabled, rateLimitEnabled, rateLimitTimeWindow, rateLimitMax,
 * requestCount) come from the plugin runtime — keep them at the column
 * level so direct DB writes don't drift from plugin behaviour.
 */
export const apikey = pgTable(
  "apikey",
  {
    configId: text("config_id").default("default").notNull(),
    createdAt: timestamp("created_at").notNull(),
    enabled: boolean("enabled").default(true),
    expiresAt: timestamp("expires_at"),
    id: text("id").primaryKey(),
    /** Hashed key bytes — plaintext is shown to the user ONCE on creation and never persisted. */
    key: text("key").notNull(),
    lastRefillAt: timestamp("last_refill_at"),
    lastRequest: timestamp("last_request"),
    /** JSON-serialised string; Better Auth handles parse/stringify. Use `text` not `jsonb` per plugin contract. */
    metadata: text("metadata"),
    name: text("name"),
    permissions: text("permissions"),
    prefix: text("prefix"),
    rateLimitEnabled: boolean("rate_limit_enabled").default(true),
    rateLimitMax: integer("rate_limit_max").default(10_000),
    rateLimitTimeWindow: integer("rate_limit_time_window").default(86_400_000),
    referenceId: text("reference_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    refillAmount: integer("refill_amount"),
    refillInterval: integer("refill_interval"),
    remaining: integer("remaining"),
    requestCount: integer("request_count").default(0),
    /** First 4-8 plaintext chars (the prefix portion) for "starts with" lookups in dashboard list views. */
    start: text("start"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("apikey_config_id_idx").on(table.configId),
    index("apikey_reference_id_idx").on(table.referenceId),
    // Verification (`require-api-key` middleware) hashes the inbound bearer
    // and looks it up here — make sure that read is indexed.
    index("apikey_key_idx").on(table.key),
  ],
);

export type Apikey = typeof apikey.$inferSelect;
export type ApikeyInsert = typeof apikey.$inferInsert;
