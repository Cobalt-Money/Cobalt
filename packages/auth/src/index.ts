import { db } from "@cobalt-web/db";
import * as schema from "@cobalt-web/db/schema/auth";
import { env } from "@cobalt-web/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { lastLoginMethod, openAPI } from "better-auth/plugins";
import { google } from "better-auth/social-providers";

import { getAppleClientSecret } from "./apple-secret.js";

const appleClientSecret = await getAppleClientSecret();

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
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    },
  },
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
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
  ],
  secret: env.BETTER_AUTH_SECRET,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    expiresIn: 60 * 60 * 24 * 30,
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
