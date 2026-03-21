import { auth } from "@cobalt-web/auth";
import { env } from "@cobalt-web/env/server";
import { mutators, queries, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import { OpenAPIHono } from "@hono/zod-openapi";
import { mustGetMutator, mustGetQuery } from "@rocicorp/zero";
import { handleMutateRequest, handleQueryRequest } from "@rocicorp/zero/server";
import { zeroNodePg } from "@rocicorp/zero/server/adapters/pg";
import { Pool } from "pg";

const zeroRouter = new OpenAPIHono();

const pool = env.ZERO_UPSTREAM_DB
  ? new Pool({
      connectionString: env.ZERO_UPSTREAM_DB,
      max: env.ZERO_DB_POOL_MAX,
    })
  : undefined;

const dbProvider = pool ? zeroNodePg(schema, pool) : undefined;

const getContext = async (req: Request): Promise<Context> => {
  const session = await auth.api.getSession(req);
  return session ? { userId: session.user.id } : undefined;
};

zeroRouter.post("/query", async (c) => {
  const ctx = await getContext(c.req.raw);
  const result = await handleQueryRequest(
    (name, args) => mustGetQuery(queries, name).fn({ args, ctx }),
    schema,
    c.req.raw
  );
  return c.json(result);
});

zeroRouter.post("/mutate", async (c) => {
  if (!dbProvider) {
    return c.json({ error: "Zero not configured" }, 500);
  }

  const ctx = await getContext(c.req.raw);
  if (!ctx) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await handleMutateRequest(
    dbProvider,
    (transact) =>
      transact((tx, name, args) =>
        // Empty mutators registry — add @rocicorp/zero mutators when needed
        // @ts-expect-error TS2339 — mustGetMutator is never until mutators are defined
        mustGetMutator(mutators, name).fn({ args, ctx, tx })
      ),
    c.req.raw
  );
  return c.json(result);
});

export { zeroRouter };
