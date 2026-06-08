import { env } from "@cobalt-web/env/web";
import { hc } from "hono/client";
import type { PlaidRouter, UserRouter } from "server/index.ts";

// Hono RPC client. Per-feature proxy pattern (mirrors web) to avoid TS2589
// recursion as more routes get added.
const url = env.VITE_SERVER_URL;
const init = { init: { credentials: "include" } } as const;

export const plaidApi = hc<PlaidRouter>(`${url}/api/plaid`, init);
export const userApi = hc<UserRouter>(`${url}/api/user`, init);
