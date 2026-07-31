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
    /**
     * Display variant preserving original casing while `username` is canonical
     * lowercase for uniqueness. Plugin convention.
     */
    displayUsername: text("display_username"),
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
    /**
     * SRI-349 — E.164 phone number for friend-invite matching. Optional profile
     * field. Not currently used for auth/SMS-OTP — if Better Auth Phone Number
     * plugin lands later, swap to that and migrate column ownership.
     *
     * Normalize to E.164 (+15551234567) at insert.
     */
    phoneNumber: text("phone_number").unique(),
    stripeCustomerId: text("stripe_customer_id").unique(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    /**
     * SRI-349 — Better Auth Username plugin. Unique handle for `@mention`-style
     * friend invites. Null until user picks one (set via plugin endpoint).
     */
    username: text("username").unique(),
  },
  (table) => [
    index("user_email_idx").on(table.email),
    index("user_username_idx").on(table.username),
    index("user_phone_number_idx").on(table.phoneNumber),
  ],
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
    backchannelLogoutSessionRequired: boolean("backchannel_logout_session_required"),
    backchannelLogoutUri: text("backchannel_logout_uri"),
    clientId: varchar("client_id", { length: 255 }).notNull().unique(),
    clientSecret: text("client_secret"),
    contacts: text("contacts").array(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }),
    disabled: boolean("disabled"),
    /**
     * Per-client opt-in to RFC 9449 DPoP sender-constrained tokens. Left at the
     * plugin default of false: `verifyOAuthAccessTokenForMcp` calls
     * `verifyBearerToken`, which rejects any token carrying a `cnf.jkt`. A
     * client flipping this on would authenticate fine and then fail every MCP
     * request until that verifier moves to `verifyAccessTokenRequest`.
     */
    dpopBoundAccessTokens: boolean("dpop_bound_access_tokens").default(false),
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
    authorizationCodeId: text("authorization_code_id"),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    /** RFC 9449 `cnf` claim (`{ jkt }`) when the token is DPoP-bound. */
    confirmation: jsonb("confirmation"),
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
    /** OIDC `claims` request parameter, replayed into the issued id_token. */
    requestedUserInfoClaims: text("requested_user_info_claims").array(),
    /** RFC 8707 resource indicators this token was issued for. */
    resources: text("resources").array(),
    revoked: timestamp("revoked", { precision: 6, withTimezone: true }),
    /**
     * Refresh-token rotation (beta.10): `rotated_at` marks a token as spent,
     * and a replay within the grace window returns the cached
     * `rotation_replay_response` instead of revoking the family — this is what
     * keeps a client that retries a dropped token response from being logged
     * out.
     */
    rotatedAt: timestamp("rotated_at", { precision: 6, withTimezone: true }),
    rotationReplayExpiresAt: timestamp("rotation_replay_expires_at", {
      precision: 6,
      withTimezone: true,
    }),
    rotationReplayResponse: text("rotation_replay_response"),
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
    index("oauth_refresh_token_authorization_code_id_idx").on(table.authorizationCodeId),
    index("oauth_refresh_token_client_id_idx").on(table.clientId),
    index("oauth_refresh_token_user_id_idx").on(table.userId),
    index("oauth_refresh_token_reference_id_idx").on(table.referenceId),
    index("oauth_refresh_token_session_id_idx").on(table.sessionId),
  ],
);

export const oauthAccessToken = pgTable(
  "oauth_access_token",
  {
    authorizationCodeId: text("authorization_code_id"),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    /** RFC 9449 `cnf` claim (`{ jkt }`) when the token is DPoP-bound. */
    confirmation: jsonb("confirmation"),
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
    /** OIDC `claims` request parameter, replayed into the issued id_token. */
    requestedUserInfoClaims: text("requested_user_info_claims").array(),
    /** RFC 8707 resource indicators this token was issued for. */
    resources: text("resources").array(),
    revoked: timestamp("revoked", { precision: 6, withTimezone: true }),
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
    /** OIDC `claims` the user consented to release. */
    requestedUserInfoClaims: text("requested_user_info_claims").array(),
    /** RFC 8707 resource indicators covered by this consent. */
    resources: text("resources").array(),
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

/**
 * Protected resources (RFC 8707 resource indicators) the OAuth provider will
 * mint tokens for — i.e. the allowed `aud` values. Added by
 * `@better-auth/oauth-provider` 1.7.0-beta.6, which deleted the static
 * `validAudiences` option in favour of this table so each resource can carry
 * its own policy (TTLs, signing key, scope allowlist, DPoP requirement).
 *
 * Rows are seeded by the plugin from `resources: [...]` in `@cobalt-web/auth`;
 * do not hand-insert. `identifier` is the natural key the plugin looks up by
 * and the FK target for `oauth_client_resource`, hence `.unique()`.
 */
export const oauthResource = pgTable("oauth_resource", {
  accessTokenTtl: integer("access_token_ttl"),
  allowedScopes: text("allowed_scopes").array(),
  createdAt: timestamp("created_at", { precision: 6, withTimezone: true }),
  customClaims: jsonb("custom_claims"),
  disabled: boolean("disabled").default(false),
  dpopBoundAccessTokensRequired: boolean("dpop_bound_access_tokens_required").default(false),
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  metadata: jsonb("metadata"),
  name: text("name").notNull(),
  policyVersion: integer("policy_version").default(1),
  refreshTokenTtl: integer("refresh_token_ttl"),
  signingAlgorithm: text("signing_algorithm"),
  signingKeyId: text("signing_key_id"),
  updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true }),
});

/**
 * Join table restricting which clients may request which resources, consulted
 * only when `enforcePerClientResources` is on. We keep it off: MCP clients
 * arrive through dynamic registration and never declare `resources` at
 * registration time, so nothing would ever populate this and every token
 * request would fail `invalid_target`. The table still has to exist — the
 * plugin declares the model, and the Drizzle adapter throws on any model
 * missing from the schema object regardless of whether a row is ever read.
 */
export const oauthClientResource = pgTable(
  "oauth_client_resource",
  {
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }),
    id: text("id").primaryKey(),
    metadata: jsonb("metadata"),
    resourceId: text("resource_id")
      .notNull()
      .references(() => oauthResource.identifier, { onDelete: "cascade" }),
  },
  (table) => [
    index("oauth_client_resource_client_id_idx").on(table.clientId),
    index("oauth_client_resource_resource_id_idx").on(table.resourceId),
  ],
);

/**
 * Replay guard for `private_key_jwt` client assertions: one row per assertion
 * `jti`, inserted before the assertion is accepted so a reused `jti` collides
 * on the primary key. Added in 1.7.0-beta.5 and missed by that bump — no MCP
 * client authenticates this way today, but `private_key_jwt` is advertised in
 * our `token_endpoint_auth_methods_supported`, so a client taking us up on it
 * would hit the same missing-model 500 the resource tables just caused.
 */
export const oauthClientAssertion = pgTable("oauth_client_assertion", {
  expiresAt: timestamp("expires_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  id: text("id").primaryKey(),
});

export const jwks = pgTable(
  "jwks",
  {
    /**
     * Key algorithm + curve, recorded on the row from beta.10 onward instead of
     * being inferred from the stored JWK. The single live key is EdDSA/Ed25519
     * (`kid` tWWBt1F0TAnBN4qrDPNoWflYwavkD4UU); both stay NULL on it and get
     * populated on the next key generated.
     */
    alg: text("alg"),
    createdAt: timestamp("created_at", {
      precision: 6,
      withTimezone: true,
    }).notNull(),
    crv: text("crv"),
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
export type OauthResource = typeof oauthResource.$inferSelect;
export type OauthResourceInsert = typeof oauthResource.$inferInsert;
export type OauthClientResource = typeof oauthClientResource.$inferSelect;
export type OauthClientResourceInsert = typeof oauthClientResource.$inferInsert;
export type OauthClientAssertion = typeof oauthClientAssertion.$inferSelect;
export type OauthClientAssertionInsert = typeof oauthClientAssertion.$inferInsert;
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
