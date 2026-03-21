import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const accountsRouter = new OpenAPIHono();

accountsRouter.use("/*", requireAuth);

// GET  /              → list all bank accounts
// GET  /bank/:id      → get bank account details
// DELETE /bank/:id    → disconnect bank account
// GET  /brokerage     → list brokerage accounts
// DELETE /brokerage/:id → disconnect brokerage account
// GET  /credit-cards  → list credit cards
// PATCH /credit-cards/:id/credit-limit → set credit limit override
// DELETE /credit-cards/:id/credit-limit → reset credit limit override
// GET  /items/:itemId → get accounts for a Plaid item
// GET  /plaid-items   → list Plaid items
// GET  /plaid-items/alerts → items needing attention

export { accountsRouter };
