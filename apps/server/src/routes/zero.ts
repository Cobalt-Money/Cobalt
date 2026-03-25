import { auth } from "@cobalt-web/auth";
import { env } from "@cobalt-web/env/server";
import { userHasActiveSubscription } from "@cobalt-web/server-data/subscriptions";
import { mutators, queries, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import { OpenAPIHono } from "@hono/zod-openapi";
import { mustGetMutator, mustGetQuery } from "@rocicorp/zero";
import { handleMutateRequest, handleQueryRequest } from "@rocicorp/zero/server";
import { zeroNodePg } from "@rocicorp/zero/server/adapters/pg";
import { Pool } from "pg";

const zeroRouter = new OpenAPIHono();

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.ZERO_DB_POOL_MAX,
});

const dbProvider = pool ? zeroNodePg(schema, pool) : undefined;

/** Same policy as `requirePaidUser`: session + active subscription. */
async function resolvePaidUserContext(
  req: Request
): Promise<{ ok: true; ctx: Context } | { ok: false; status: 401 | 403 }> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return { ok: false, status: 401 };
  }
  const entitled = await userHasActiveSubscription(session.user.id);
  if (!entitled) {
    return { ok: false, status: 403 };
  }
  return { ctx: { userId: session.user.id }, ok: true };
}

zeroRouter.post("/query", async (c) => {
  const paid = await resolvePaidUserContext(c.req.raw);
  if (!paid.ok) {
    return c.json(
      {
        error: paid.status === 401 ? "Unauthorized" : "Subscription required",
      },
      paid.status
    );
  }
  const result = await handleQueryRequest(
    (name, args) => mustGetQuery(queries, name).fn({ args, ctx: paid.ctx }),
    schema,
    c.req.raw
  );
  return c.json(result);
});

zeroRouter.post("/mutate", async (c) => {
  if (!dbProvider) {
    return c.json({ error: "Zero not configured" }, 500);
  }

  const paid = await resolvePaidUserContext(c.req.raw);
  if (!paid.ok) {
    return c.json(
      {
        error: paid.status === 401 ? "Unauthorized" : "Subscription required",
      },
      paid.status
    );
  }

  const result = await handleMutateRequest(
    dbProvider,
    (transact) =>
      transact((tx, name, args) =>
        // Empty mutators registry — add @rocicorp/zero mutators when needed
        // @ts-expect-error TS2339 — mustGetMutator is never until mutators are defined
        mustGetMutator(mutators, name).fn({ args, ctx: paid.ctx, tx })
      ),
    c.req.raw
  );
  return c.json(result);
});

export { zeroRouter };
