import { env } from "@cobalt-web/env/server";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { mutators, queries, schema } from "@cobalt-web/zero";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AnyCustomQuery } from "@rocicorp/zero";
import { mustGetMutator, mustGetQuery } from "@rocicorp/zero";
import { handleMutateRequest, handleQueryRequest } from "@rocicorp/zero/server";
import { zeroNodePg } from "@rocicorp/zero/server/adapters/pg";
import { Pool } from "pg";

import { requirePaidUser } from "./middleware.js";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.ZERO_DB_POOL_MAX,
});

const dbProvider = pool ? zeroNodePg(schema, pool) : undefined;

const zeroRouter = new OpenAPIHono<AppEnv>()
  .post("/query", requirePaidUser, async (c) => {
    const zeroContext = c.get("zeroContext");
    const result = await handleQueryRequest(
      (name, args) =>
        (
          mustGetQuery(
            queries as unknown as Parameters<typeof mustGetQuery>[0],
            name,
          ) as AnyCustomQuery
        ).fn({
          args,
          ctx: zeroContext,
        }),
      schema,
      c.req.raw,
    );
    return c.json(result);
  })
  .post("/mutate", requirePaidUser, async (c) => {
    if (!dbProvider) {
      return c.json({ error: "Zero not configured" }, 500);
    }
    const zeroContext = c.get("zeroContext");

    try {
      const result = await handleMutateRequest(
        dbProvider,
        (transact) =>
          transact((tx, name, args) =>
            (
              mustGetMutator(mutators as unknown as Parameters<typeof mustGetMutator>[0], name) as {
                fn: (opts: {
                  args: unknown;
                  ctx: typeof zeroContext;
                  tx: typeof tx;
                }) => Promise<void>;
              }
            ).fn({
              args,
              ctx: zeroContext,
              tx,
            }),
          ),
        c.req.raw,
      );
      return c.json(result);
    } catch (error) {
      console.error("[zero mutate] handleMutateRequest threw", {
        error,
        userId: zeroContext?.userId,
      });
      throw error;
    }
  });

export { zeroRouter };
