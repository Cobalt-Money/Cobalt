import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_ZERO_CACHE_URL: z.string().optional(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vite's import.meta.env requires this cast
  runtimeEnv: (import.meta as any).env,
});
