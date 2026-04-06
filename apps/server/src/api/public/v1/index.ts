import { OpenAPIHono } from "@hono/zod-openapi";

import { requireOAuth } from "../middleware";
import { tickersRouter } from "./tickers";

export const v1Router = new OpenAPIHono()
  .use("/*", requireOAuth)
  .route("/tickers", tickersRouter);
