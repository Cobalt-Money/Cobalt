import { env } from "@cobalt-web/env/web";
import { hc } from "hono/client";
import type { PlaidRouter, UserRouter } from "server/index.ts";

// Hono RPC client. Friends only needs Plaid for add-account; mirror web's
// per-feature proxy pattern so we can grow without hitting TS2589 recursion.
const url = env.VITE_SERVER_URL;
const init = { init: { credentials: "include" } } as const;

export const plaidApi = hc<PlaidRouter>(`${url}/api/plaid`, init);
export const userApi = hc<UserRouter>(`${url}/api/user`, init);
