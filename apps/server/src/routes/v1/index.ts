import { OpenAPIHono } from "@hono/zod-openapi";

import { requireOAuth } from "../../middleware/oauth.js";
import { tickersRouter } from "./tickers.js";

export const v1Router = new OpenAPIHono()
  .use("/*", requireOAuth)
  .route("/tickers", tickersRouter);
