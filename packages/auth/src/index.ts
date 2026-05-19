import { oauthProvider } from "@better-auth/oauth-provider";
import { stripe } from "@better-auth/stripe";
import { db } from "@cobalt-web/db";
import * as authSchema from "@cobalt-web/db/schema/users/auth/auth";
import * as stripeSchema from "@cobalt-web/db/schema/users/subscriptions/stripe";
import { env } from "@cobalt-web/env/server";
import { Redis } from "@upstash/redis";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, jwt, lastLoginMethod, openAPI } from "better-auth/plugins";
import { bearer } from "better-auth/plugins/bearer";
import { Stripe } from "stripe";

import { getAppleClientSecret } from "./apple-secret.js";
import { seedUserCategories } from "./seed-user-categories.js";

/**
 * Upstash Redis used as Better Auth's secondaryStorage. Powers:
 *   - Session cache (faster than Postgres lookup on cookieCache miss)
 *   - Rate-limit counters for `/api/auth/*` routes (distributed across
 *     Vercel function instances + regions; in-memory was leaky on serverless)
 *   - Verification token storage if we ever enable email-OTP/magic-link
 *
 * HTTP-based client — no connection pool, ideal for serverless cold starts.
 * Env vars are optional; when unset, Better Auth falls back to default
 * in-memory storage and the rate-limit/session caching downgrades gracefully.
 */
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        token: env.UPSTASH_REDIS_REST_TOKEN,
        url: env.UPSTASH_REDIS_REST_URL,
      })
    : null;

/**
 * Reads swallow errors and return null so callers fall through to Postgres
 * (session/verification rows are mirrored there). Writes rethrow — silently
 * dropping a `set`/`delete` would leave stale sessions or skewed rate-limit
 * counters, which is worse than a 5xx the user can retry.
 *
 * Original errors are logged server-side only; the rethrown message is generic
 * so 5xx response bodies never leak Redis/Upstash provider details.
 */
const STORAGE_UNAVAILABLE = "session storage unavailable";

const secondaryStorage = redis
  ? {
      delete: async (key: string) => {
        try {
          await redis.del(key);
        } catch (error) {
          console.error("[auth] secondary-storage delete failed", {
            error,
            key,
          });
          throw new Error(STORAGE_UNAVAILABLE, { cause: error });
        }
      },
      get: async (key: string) => {
        try {
          const v = await redis.get<string>(key);
          return v ?? null;
        } catch (error) {
          console.warn("[auth] secondary-storage get failed, falling back to db", { error, key });
          return null;
        }
      },
      set: async (key: string, value: string, ttl?: number) => {
        try {
          await (ttl ? redis.set(key, value, { ex: ttl }) : redis.set(key, value));
        } catch (error) {
          console.error("[auth] secondary-storage set failed", { error, key });
          throw new Error(STORAGE_UNAVAILABLE, { cause: error });
        }
      },
    }
  : undefined;

const schema = { ...authSchema, ...stripeSchema };

export const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
});

const appleClientSecret = await getAppleClientSecret();

/** Where `/login` and `/oauth/consent` routes live (Vite app). Relative paths would resolve on the API host and 404. */
const spaOrigin = env.CORS_ORIGIN.replace(/\/$/, "");

/** MCP OAuth token exchange sends `resource` = this URL; must be listed in `validAudiences` or exchange fails with "requested resource invalid". */
const oauthIssuerOrigin = new URL(env.BETTER_AUTH_URL).origin;
const mcpResourceAudience = `${oauthIssuerOrigin}/api/mcp`;

/** Only send Secure cookies when the auth server is actually on HTTPS. */
const isSecureOrigin = env.BETTER_AUTH_URL.startsWith("https://");

const trustedOrigins = [
  env.CORS_ORIGIN,
  "http://localhost:3000",
  "http://localhost:3001",
  "https://try-cobalt.com",
  "https://www.try-cobalt.com",
  "https://demo.try-cobalt.com",
  "Cobalt-mobile://",
  "https://appleid.apple.com",
  ...env.TRUSTED_ORIGINS_EXTRA,
];

export const auth = betterAuth({
  account: {
    accountLinking: {
      enabled: true,
    },
    // Stored OAuth provider tokens (Google access/refresh) are encrypted at
    // rest via AES-256-GCM. Without this, a DB read leak surfaces plaintext
    // bearer tokens for every linked account.
    encryptOAuthTokens: true,
  },
  advanced: {
    crossSubDomainCookies:
      isSecureOrigin && env.COOKIE_DOMAIN
        ? { domain: env.COOKIE_DOMAIN, enabled: true }
        : { enabled: false },
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureOrigin,
    },
  },
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await seedUserCategories(db, user.id);
          } catch (error) {
            console.error(`[auth] failed to seed categories for user ${user.id}:`, error);
          }
          // Lightweight audit trail for demo accounts so we can spot abnormal
          // creation volume (spam, automation) without joining the user table.
          const u = user as { isAnonymous?: boolean; email?: string | null };
          if (u.isAnonymous) {
            console.info(`[auth.audit] demo_user_created id=${user.id} email=${u.email ?? ""}`);
          }
        },
      },
    },
  },
  disabledPaths: ["/token"],
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    lastLoginMethod({
      maxAge: 60 * 60 * 24 * 30,
      storeInDatabase: false,
    }),
    openAPI(),
    bearer(),
    jwt({
      disableSettingJwtHeader: true,
    }),
    /**
     * Powers the /api/demo/create endpoint. Adds `user.is_anonymous` column +
     * `/sign-in/anonymous` route that mints a user + session in one call. Demo
     * router calls that, then seeds fixtures. `requireNotDemo` middleware,
     * cleanup cron, and the banner UI all branch on `user.isAnonymous` — every
     * anonymous user in this app is a demo, so the flag is the single source.
     */
    anonymous({
      emailDomainName: "demo.cobalt.internal",
      // No link-account hook: demo users never upgrade in-place; if a visitor
      // wants to keep their data they sign up fresh.
    }),
    // this basically allows us to not have to configure all of the clients ourselvers(cursor, claude code, etc.)
    oauthProvider({
      accessTokenExpiry: 60 * 60 * 24, // 24 hours — MCP clients don't reliably handle refresh tokens
      allowDynamicClientRegistration: true,
      // MCP clients (Cursor, etc.) register without a session; see "Dynamic Registration" / MCP in
      // https://better-auth.com/docs/plugins/oauth-provider
      allowUnauthenticatedClientRegistration: true,
      consentPage: `${spaOrigin}/oauth/consent`,
      loginPage: `${spaOrigin}/login`,
      // Required for MCP: clients send `resource` = MCP HTTPS URL at token exchange; must be allowed.
      validAudiences: [mcpResourceAudience, oauthIssuerOrigin],
    }),
    stripe({
      createCustomerOnSignUp: false,
      onEvent: async (event) => {
        await Promise.resolve();
        if (event.type === "invoice.payment_failed") {
          const invoice = event.data.object as Stripe.Invoice;
          console.warn(
            `[stripe] payment failed for invoice ${invoice.id} (customer ${invoice.customer as string})`,
          );
        }
      },
      stripeClient,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      subscription: {
        authorizeReference: async ({ user, referenceId }) => {
          await Promise.resolve();
          return referenceId === user.id;
        },
        enabled: true,
        getCheckoutSessionParams: () => ({
          params: {
            allow_promotion_codes: true,
          },
        }),
        onSubscriptionUpdate: async ({ subscription }) => {
          await Promise.resolve();
          if (subscription.status === "past_due" || subscription.status === "unpaid") {
            console.warn(
              `[stripe] subscription ${subscription.id} is ${subscription.status} (user ${subscription.referenceId})`,
            );
          }
        },
        plans: [
          {
            lookupKey: "cobalt_monthly",
            name: "cobalt-monthly",
          },
          {
            lookupKey: "cobalt_annual",
            name: "cobalt-annual",
          },
        ],
      },
    }),
  ],
  rateLimit: {
    // `secondary-storage` routes counters into the Upstash Redis adapter
    // above when configured; otherwise Better Auth falls back to its default
    // in-memory bucket (fine for dev, leaky on serverless prod).
    storage: secondaryStorage ? "secondary-storage" : "memory",
  },
  secondaryStorage,
  secret: env.BETTER_AUTH_SECRET,
  session: {
    // Required by @better-auth/oauth-provider when JWT / secondary session storage is enabled.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    expiresIn: 60 * 60 * 24 * 30,
    storeSessionInDatabase: true,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: {
    apple: {
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
      clientId: env.APPLE_SERVICE_ID,
      clientSecret: appleClientSecret,
    },
    google: {
      clientId: [env.GOOGLE_CLIENT_ID, env.GOOGLE_IOS_CLIENT_ID],
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins,
  user: {
    additionalFields: {
      // isAnonymous is registered by the anonymous() plugin itself; no need
      // to declare here. It will appear on session.user automatically.
      lastSeenAt: {
        required: false,
        type: "date",
      },
    },
  },
});
