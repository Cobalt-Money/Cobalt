import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {
    /** Logo.dev publishable key for merchant logos (`img.logo.dev`). Optional — logos fall back when unset. */
    VITE_LOGO_DEV_PUBLISHABLE_KEY: z.string().optional(),
    VITE_SERVER_URL: z.url(),
    VITE_ZERO_CACHE_URL: z.string().optional(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vite's import.meta.env requires this cast
  runtimeEnv: (import.meta as any).env,
});
