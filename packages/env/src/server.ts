import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const commaList = z
  .string()
  .optional()
  .transform((s) =>
    s
      ? s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : []
  );

/** One or more origins, comma-separated (e.g. prod web + preview URLs). */
const commaSeparatedUrls = z
  .string()
  .min(1)
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  )
  .pipe(z.array(z.url()).min(1));

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().min(1),
    APPLE_KEY_ID: z.string().min(1),
    APPLE_PRIVATE_KEY: z.string().min(1),
    APPLE_SERVICE_ID: z.string().min(1),
    APPLE_TEAM_ID: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: commaSeparatedUrls,
    /** Cap @cobalt-web/db pool size — default 10 per `pg` is too high for small Postgres (Neon free, etc.). */
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(5),
    DATABASE_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_IOS_CLIENT_ID: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PLAID_CLIENT_ID: z.string().min(1),
    PLAID_CLIENT_SECRET: z.string().min(1),
    PLAID_ENV: z.string().min(1).default("sandbox"),
    PLAID_WEBHOOK_URL: z.url().optional(),
    /**
     * SPA origin (where the browser loads the web app). Used for OIDC `loginPage`,
     * Stripe billing return URL, etc. If unset, the first `CORS_ORIGIN` entry is used.
     */
    PUBLIC_APP_URL: z.url().optional(),
    SNAPTRADE_CLIENT_ID: z.string().min(1),
    SNAPTRADE_CONSUMER_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    TRUSTED_ORIGINS_EXTRA: commaList,
    /** Pool for Zero mutate adapter (keep small if same DB as `DATABASE_URL`). */
    ZERO_DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(2),
  },
});
