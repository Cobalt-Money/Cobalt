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
    DATABASE_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_IOS_CLIENT_ID: z.string().min(1),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    TRUSTED_ORIGINS_EXTRA: commaList,
    ZERO_UPSTREAM_DB: z.string().min(1).optional(),
  },
});
