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
    CORS_ORIGIN: z.url(),
    /** Cap @cobalt-web/db pool size — default 10 per `pg` is too high for small Postgres (Neon free, etc.). */
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(5),
    DATABASE_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_IOS_CLIENT_ID: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    TRUSTED_ORIGINS_EXTRA: commaList,
    /** Pool for Zero mutate adapter when `ZERO_UPSTREAM_DB` is set (keep small if same DB as `DATABASE_URL`). */
    ZERO_DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(2),
    ZERO_UPSTREAM_DB: z.string().min(1).optional(),
  },
});
