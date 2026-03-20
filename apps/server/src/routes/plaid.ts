import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const plaidRouter = new OpenAPIHono();

// Most routes require auth
plaidRouter.use("/*", requireAuth);

// TODO: Port from horizon-test
// POST /create-link-token     → create Plaid Link token
// POST /exchange-token        → exchange public token for access token
// POST /items/persist         → persist Plaid item + trigger syncs
// POST /link-token/update     → update mode link token (reauth, add accounts)
// POST /sync-new-accounts     → sync newly added accounts
// POST /clear-reauth          → clear re-auth state
// GET  /balance-snapshots     → historical balance snapshots
// GET  /accounts              → legacy account list
// GET  /institutions          → search Plaid institutions (public)
// GET  /institutions/:id      → institution details (public)
// GET  /institutions/db/:id   → institution from local DB (public)
// POST /institutions/sync     → sync institution to local DB

export { plaidRouter };
