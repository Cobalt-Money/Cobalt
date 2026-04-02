import { oauthProvider } from "@better-auth/oauth-provider";
import { stripe } from "@better-auth/stripe";
import { db } from "@cobalt-web/db";
import * as schema from "@cobalt-web/db/schema/auth";
import { env } from "@cobalt-web/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { jwt, lastLoginMethod, openAPI } from "better-auth/plugins";
import { bearer } from "better-auth/plugins/bearer";
import { google } from "better-auth/social-providers";
import { Stripe } from "stripe";

import { getAppleClientSecret } from "./apple-secret.js";

export const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
});

const appleClientSecret = await getAppleClientSecret();

/** Where `/login` and `/oauth/consent` routes live (Vite app). Relative paths would resolve on the API host and 404. */
const spaOrigin = env.CORS_ORIGIN.replace(/\/$/, "");

/** MCP OAuth token exchange sends `resource` = this URL; must be listed in `validAudiences` or exchange fails with "requested resource invalid". */
const oauthIssuerOrigin = new URL(env.BETTER_AUTH_URL).origin;
const mcpResourceAudience = `${oauthIssuerOrigin}/api/mcp`;

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
  },
  advanced: {
    // `lax` aligns with Zero cookie guidance (avoid `SameSite=None` for WS sync).
    // If you need cookies across different sites, use subdomain deployment + Better Auth
    // cross-subdomain cookies instead of `none` here.
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    },
  },
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  disabledPaths: ["/token"],
  emailAndPassword: {
    enabled: false,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      ctx.context.socialProviders = [
        ...ctx.context.socialProviders,
        {
          ...google({
            clientId: env.GOOGLE_IOS_CLIENT_ID,
          }),
          id: "google_ios",
        },
      ];
      await Promise.resolve();
    }),
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
    // this basically allows us to not have to configure all of the clients ourselvers(cursor, claude code, etc.)
    oauthProvider({
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
      stripeClient,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      subscription: {
        authorizeReference: async ({ user, referenceId }) => {
          await Promise.resolve();
          return referenceId === user.id;
        },
        enabled: true,
        plans: [
          {
            lookupKey: "cobalt_monthly",
            name: "cobalt-monthly",
          },
          {
            freeTrial: {
              days: 30,
            },
            lookupKey: "cobalt_annual",
            name: "cobalt-annual",
          },
        ],
      },
    }),
  ],
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
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins,
  user: {
    additionalFields: {
      lastSeenAt: {
        required: false,
        type: "date",
      },
    },
  },
});
