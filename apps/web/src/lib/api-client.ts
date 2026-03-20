import { env } from "@cobalt-web/env/web";
import { hc } from "hono/client";
import type { AppType } from "server/index.ts";

export const api = hc<AppType>(env.VITE_SERVER_URL, {
  init: {
    credentials: "include",
  },
});
