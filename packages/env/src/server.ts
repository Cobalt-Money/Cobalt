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
      : [],
  );

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    /** Dedicated connection URI for the agent_readonly Postgres role (SELECT-only + RLS). Falls back to DATABASE_URL in dev. */
    AGENT_DATABASE_URL: z.string().min(1).optional(),
    AGENT_DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(3),
    /** Vercel AI Gateway API key. Optional — chat endpoints return 503 when absent. */
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
    /** Vercel AI Gateway model slug (e.g. anthropic/claude-haiku-4.5). */
    AI_GATEWAY_MODEL: z.string().default("anthropic/claude-haiku-4.5"),
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().min(1),
    /** Numeric App Apple ID from App Store Connect. Required for Production App Store webhooks; ignored in Sandbox. */
    APPLE_APP_ID: z.coerce.number().int().positive().optional(),
    /** App Store Server Notifications environment. "Sandbox" (default) for dev/TestFlight, "Production" once the app ships. */
    APPLE_APP_STORE_ENVIRONMENT: z.enum(["Production", "Sandbox"]).default("Sandbox"),
    APPLE_KEY_ID: z.string().min(1),
    APPLE_PRIVATE_KEY: z.string().min(1),
    APPLE_SERVICE_ID: z.string().min(1),
    APPLE_TEAM_ID: z.string().min(1),
    /** Public web app origin for Stripe return URLs (billing portal, etc.). */
    APP_URL: z.url().default("https://cobaltpf.com"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    /** Vercel Blob read/write token. Required for CSV import file storage. */
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    /** Cookie domain for cross-subdomain auth (e.g. `.cobaltpf.com`). Omit in dev. */
    COOKIE_DOMAIN: z.string().min(1).optional(),
    CORS_ORIGIN: z.url(),
    /** Secret token for Vercel Cron Job routes — set in Vercel env, also in local .env for testing. */
    CRON_SECRET: z.string().min(1).optional(),
    /** Cap @cobalt-web/db pool size — default 10 per `pg` is too high for small Postgres (Neon free, etc.). */
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(5),
    DATABASE_URL: z.string().min(1),
    /** Financial Modeling Prep — market data / fundamentals. */
    FMP_API_KEY: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_IOS_CLIENT_ID: z.string().min(1),
    LOCAL_DATABASE_URL: z.string().min(1).optional(),
    /** Drizzle Kit DDL: superuser URL locally. See `db:migrate:local`. */
    MIGRATION_URI: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    /** Parallel web search API key. Optional — web search/extract tools are disabled when absent. */
    PARALLEL_API_KEY: z.string().min(1).optional(),
    PLAID_CLIENT_ID: z.string().min(1),
    PLAID_CLIENT_SECRET: z.string().min(1),
    PLAID_ENV: z.string().min(1).default("sandbox"),
    PLAID_WEBHOOK_URL: z.url().optional(),
    /** Authorization token sent in the `Authorization` header to the sandbox CF Worker. Must match the Worker's `AUTH_TOKEN` secret. */
    SANDBOX_WORKER_AUTH_TOKEN: z.string().min(32).optional(),
    /** URL of the deployed sandbox Cloudflare Worker (e.g. https://cobalt-sandbox.workers.dev). When unset, sandbox runs are disabled. */
    SANDBOX_WORKER_URL: z.url().optional(),
    SNAPTRADE_CLIENT_ID: z.string().min(1),
    SNAPTRADE_CONSUMER_KEY: z.string().min(1),
    STOCK_NEWS_API_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    TRUSTED_ORIGINS_EXTRA: commaList,
    /** Upstash Redis REST endpoint + token. Provisioned via Vercel Marketplace. Optional for local dev — falls back to in-memory rate limits when unset. */
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    /** Pool for Zero mutate adapter (keep small if same DB as `DATABASE_URL`). */
    ZERO_DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(2),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
