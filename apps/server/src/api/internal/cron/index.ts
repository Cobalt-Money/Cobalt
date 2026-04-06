import { OpenAPIHono } from "@hono/zod-openapi";

import { financialEventsCronRouter } from "./financial-events";
import { snapshotsCronRouter } from "./snapshots";

export const cronRouter = new OpenAPIHono();

// CRON_SECRET bearer token check
cronRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});

cronRouter.route("/", snapshotsCronRouter);
cronRouter.route("/", financialEventsCronRouter);
