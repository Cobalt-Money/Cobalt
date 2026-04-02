import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Env for the Fumadocs app only — avoids validating the full server schema (Stripe, DB, …). */
export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    OPENAPI_URL: z.url().default("http://localhost:3000/openapi.json"),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_MODEL: z.string().default("anthropic/claude-3.5-sonnet"),
  },
});
