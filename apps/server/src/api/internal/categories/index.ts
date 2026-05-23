import { OpenAPIHono } from "@hono/zod-openapi";

import { createRouter } from "./create.js";
import { deleteRouter } from "./delete.js";
import { groupsCreateRouter } from "./groups/create.js";
import { groupsDeleteRouter } from "./groups/delete.js";
import { groupsPatchRouter } from "./groups/patch.js";
import { groupsReorderRouter } from "./groups/reorder.js";
import { hideRouter } from "./hide.js";
import { listRouter } from "./list.js";
import { patchRouter } from "./patch.js";
import { reorderRouter } from "./reorder.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const categoriesRouter = new OpenAPIHono()
  .route("/", listRouter)
  .route("/", createRouter)
  .route("/", reorderRouter)
  .route("/", groupsReorderRouter)
  .route("/", groupsCreateRouter)
  .route("/", groupsPatchRouter)
  .route("/", groupsDeleteRouter)
  .route("/", hideRouter)
  .route("/", patchRouter)
  .route("/", deleteRouter);
