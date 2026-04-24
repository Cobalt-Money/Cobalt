import { OpenAPIHono } from "@hono/zod-openapi";

import { creditSpendingRouter } from "./credit-spending.js";
import { listRouter } from "./list.js";
import { notesRouter } from "./notes.js";
import { overridesRouter } from "./overrides.js";
import { recurringRouter } from "./recurring.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const transactionsRouter = new OpenAPIHono()
  .route("/", listRouter)
  .route("/", recurringRouter)
  .route("/", creditSpendingRouter)
  .route("/", overridesRouter)
  .route("/", notesRouter);
