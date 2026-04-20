---
name: Cobalt — Mutations
description: How Cobalt handles writes — when to use a Zero custom mutator vs a REST (Hono RPC) endpoint, how to structure ownership checks, cascade behavior, client invocation (optimistic vs pessimistic), and when both paths need to exist side-by-side. Load when adding a feature that modifies data (create / update / delete).
version: 1.0.0
tags:
  - cobalt
  - mutations
  - zero
  - hono
  - rest
  - optimistic-ui
---

# Mutations (Cobalt)

How to write data in this codebase. Complements the generic **`.agents/skills/rocicorp-zero/writing/`** Zero docs; this file is **where things go in Cobalt** and **which path to pick**.

Counterpart of **[Data fetching](../data-fetching/SKILL.md)** (which covers reads). Same two-lane idea (Zero vs HTTP) but writes have different tradeoffs.

## Two lanes (again): Zero mutator vs REST

| Lane                    | Use for                                                                                                                                                                                     | Who calls it                             | Client library                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| **Zero custom mutator** | Writes to rows that are **replicated through Zero** (chats, transactions, accounts, etc.). You want **optimistic UI** — the sidebar / list updates sub-frame before the server round-trips. | `apps/web` only (Zero client required)   | `zero.mutate(mutators.*.xxx(args))`                            |
| **REST (Hono RPC)**     | Writes that are **not optimistic** (one-shots, third-party side effects, mobile clients, webhooks). Mobile app **cannot** use Zero — REST is its only write path.                           | `apps/web` (for non-Zero writes), mobile | `fooApi.*.$post() / $delete()` from `@/lib/clients/api-client` |

**Default rule:** if the row is in our Drizzle schema and web needs optimistic UX, write a **Zero mutator**. If the operation has any non-web consumer (mobile, server-to-server, webhook), **also** expose a **REST endpoint** that shares the same server-data mutation function.

### Writes that need BOTH paths

Most destructive or user-initiated writes need both:

- **Zero mutator** for the web app's optimistic UX.
- **REST endpoint** for mobile and for any non-Zero caller.

Both paths should ultimately call the same Drizzle mutation in `packages/server-data/*/mutations.ts` so the DB contract is one source of truth. Postgres FK cascades + Zero replication take care of fan-out after either path commits.

Reference: chat deletion — `packages/zero/src/chats/mutators.ts` (Zero) and `apps/server/src/api/internal/chat/delete.ts` (REST) both converge on `deleteChat(userId, chatId)` in `packages/server-data/src/chat/mutations.ts`.

---

## Zero mutators

### File layout

Mirror the `packages/zero/src/<domain>/` layout used for queries.

```
packages/zero/src/chats/
  lib.ts        ← shared predicates / helpers
  queries.ts    ← read-side (defineQuery)
  mutators.ts   ← write-side (defineMutator)
```

Register each domain's mutators in the root `packages/zero/src/mutators.ts`:

```ts
import { defineMutators } from "@rocicorp/zero";
import { chatsMutators } from "./chats/mutators.js";

export const mutators = defineMutators({
  chats: chatsMutators,
  // add new domains here
});
```

Mutators are registered on the Zero client (`apps/web/src/lib/providers/zero-client.tsx`) and on the server mutate endpoint (`apps/server/src/api/internal/zero.ts`) automatically via this root export.

### Anatomy of a mutator (patterned after `.sandbox/ztunes/zero/mutators.ts`)

```ts
import { defineMutator } from "@rocicorp/zero";
import { z } from "zod";
import { zql } from "../schema.js";

export const chatsMutators = {
  delete: defineMutator(
    z.object({ chatId: z.string().min(1) }),
    async ({ tx, ctx, args: { chatId } }) => {
      if (!ctx) {
        throw new Error("Not authenticated");
      }
      const chat = await tx.run(
        zql.chats.where("chatId", chatId).where("userId", ctx.userId).one()
      );
      if (!chat) {
        return; // silent no-op: row missing or not owned — works on both client and server
      }
      await tx.mutate.chats.delete({ chatId });
    }
  ),
};
```

Non-obvious rules baked into this template:

1. **Validator first.** `z.object({...})` before the async fn. Zero validates args on both client and server before the fn runs.
2. **`ctx` is server-authoritative.** `ctx.userId` comes from `toZeroContext(session.user.id)` in `requirePaidUser` (`apps/server/src/api/internal/middleware.ts`). Never take `userId` from `args` — clients can lie about args.
3. **Encode ownership in the ZQL filter, not a separate check.** `where("userId", ctx.userId)` filters by the authenticated user. If the row isn't theirs, `.one()` returns `null`, and you silently `return`. This matches ztunes `cart.remove` — no need to throw "not authorized" manually.
4. **Silent no-op when `.one()` returns `null`.** Don't branch on `tx.location === "client"` vs `"server"`. Zero runs the same fn twice (once client-optimistic, once server-authoritative) and silent-returning is correct on both sides.
5. **Don't cascade children manually.** Postgres FK cascades do it server-side; Zero's logical replication pushes the cascades back to every replica. Writing explicit child deletes in the mutator duplicates DB logic and is pathological for chats with hundreds of messages.
6. **Always `await` every `tx.mutate.*` and `tx.run(...)` call.** Missing `await` breaks transaction ordering.

### Invoking from the web (optimistic, fire-and-forget)

This is the pattern that took the longest to land on. Don't await `.server` for typical destructive actions — it blocks the UI for the full round-trip (~500ms–1s) for no reason. Use fire-and-forget with a background error handler:

```tsx
const handleDelete = () => {
  if (!chatId) return;

  const { server } = zero.mutate(mutators.chats.delete({ chatId }));

  // Background error handler — surfaces server rejections without blocking UI
  void (async () => {
    try {
      const result = await server;
      if (result.type === "error") {
        toast.error(result.error.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete chat"
      );
    }
  })();

  // Close dialog / navigate immediately — optimistic client run already updated the replica
  onOpenChange(false);
};
```

- **No spinner.** Fire the mutation, close the UI in the same frame. Zero's client-side run writes to IndexedDB sub-frame, and subscribed `useQuery` calls re-render without the deleted row before the network even starts.
- **`.server`** resolves with `{ type: "success" | "error" }`. Check both branches in the catch for clean error toasts.
- **When to await `.server` instead:** only if the next UI step **depends on Postgres truth** — e.g. navigating to a server-only permission gate, or showing a confirmation that requires server acknowledgement. Default: fire-and-forget.

Reference: `apps/web/src/components/shell/sidebar/delete-chat-dialog.tsx`.

### Server wiring

Already wired in `apps/server/src/api/internal/zero.ts`. Zero's `handleMutateRequest` uses `mustGetMutator(mutators, name)` to look up mutators by their dotted name (`chats.delete`) and runs them against a `pg.Pool` via `zeroNodePg(schema, pool)`. Nothing to change when you add a new mutator — just register it in `mutators.ts`.

### Server-only overrides (when to split)

zbugs uses `defineMutators(sharedMutators, { …overrides })` to add server-only concerns (notifications, audit logs) on top of shared mutators. **We don't do this yet.** If you need an audit trail or side-effect (e.g. enqueue a workflow after a delete), introduce `packages/zero/src/<domain>/server-mutators.ts` and plumb it into `apps/server/src/api/internal/zero.ts` — follow the zbugs pattern in `.sandbox/mono/apps/zbugs/server/server-mutators.ts`.

Otherwise, don't over-engineer. The same mutator fn runs on client and server; `tx.location === "server"` lets you branch inline for small differences (e.g. server-authoritative timestamp).

---

## REST endpoints (Hono OpenAPI)

Needed when:

- Mobile needs to call it (mobile does not run the Zero client).
- A webhook / server-to-server caller needs to trigger the write.
- There's no web optimistic UX story (e.g. "export CSV", "disconnect SnapTrade").

### File layout

```
apps/server/src/api/internal/<domain>/
  index.ts         ← composes sub-routers
  create.ts
  delete.ts
  …
```

Each sub-router exports an `OpenAPIHono` instance with **one** route defined via `createRoute`. Middleware chain applied per-route (see `apps/server/src/index.ts` for the chain contract).

### Anatomy of a delete endpoint

```ts
import { deleteChat } from "@cobalt-web/server-data/chat/mutations";
import {
  chatDeleteResponseSchema,
  chatErrorResponseSchema,
  chatIdParamSchema,
} from "@cobalt-web/server-data/chat/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Delete a chat owned by the authenticated user. REST endpoint for mobile; web uses the Zero `chats.delete` mutator.",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{chatId}",
  request: { params: chatIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: chatDeleteResponseSchema } },
      description: "Deleted",
    },
    404: {
      content: { "application/json": { schema: chatErrorResponseSchema } },
      description: "Not found or not owned",
    },
  },
  summary: "Delete chat",
  tags: ["Chat"],
});

export const chatDeleteRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const { chatId } = c.req.valid("param");
    const userId = c.var.user.id;

    const deleted = await deleteChat(userId, chatId);
    if (!deleted) {
      return c.json({ error: "Chat not found" }, 404);
    }
    return c.json({ chatId, success: true }, 200);
  }
);
```

Rules:

1. **Ownership in the `WHERE` clause** of the Drizzle mutation, same as Zero. `deleteChat(userId, chatId)` uses `and(eq(chats.chatId, chatId), eq(chats.userId, userId))` — can't touch other users' rows.
2. **Return `boolean` or a count from server-data**, branch on it in the route handler. Don't throw on "not found" inside server-data — let the HTTP layer decide the status code.
3. **Response schemas** live in `packages/server-data/<domain>/schemas.ts`, built via `createSelectSchema(table).pick(...)` where possible so the contract tracks the Drizzle schema.
4. **Middleware:**
   - `requireAuth` — session only (Better Auth cookie).
   - `requirePaidUser` — session + active subscription. Default for feature routes.
5. **Mount** the router in `apps/server/src/api/internal/<domain>/index.ts`:
   ```ts
   export const chatRouter = new OpenAPIHono()
     .route("/", chatListRouter)
     .route("/", chatDetailRouter)
     .route("/", chatCreateRouter)
     .route("/", chatDeleteRouter);
   ```
6. **Export the router type** so the Hono RPC client is typed:
   - `apps/server/src/index.ts` exports `export type ChatRouter = typeof chatRouter;`
   - Web consumes via `hc<ChatRouter>(...)` in `apps/web/src/lib/clients/api-client.ts`.

### Invoking from the web

```ts
import { chatApi } from "@/lib/clients/api-client";

const res = await chatApi[":chatId"].$delete({ param: { chatId } });
if (!res.ok) throw new Error(`${res.status}`);
```

Remember: **prefer the Zero mutator** from web when the row is Zero-replicated. Use REST only for flows without a Zero counterpart.

---

## `packages/server-data` — the DB layer

Both lanes converge here. Per-domain layout mirrors the workflows convention:

| File           | Responsibility                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `mutations.ts` | Drizzle writes only (`insert`, `update`, `delete`, `onConflictDoUpdate`). Ownership in `WHERE`. |
| `queries.ts`   | Drizzle reads only.                                                                             |
| `schemas.ts`   | Zod schemas for route params / request bodies / response envelopes.                             |
| `lib.ts`       | Pure mappers (optional).                                                                        |

Rules:

- **No** Zero imports. `packages/server-data` doesn't know about Zero — it's a plain Drizzle layer consumed by both the Zero server-mutate handler (indirectly, when the mutator does raw SQL via `tx.dbTransaction`) and the REST handlers (directly).
- **No** HTTP imports. No Hono, no middleware. Pure DB functions.
- **No** workflow directives. Mutations called from workflows live here too; workflow steps wrap them with retry/skip policy.

---

## Cascade behavior + Zero replication

When the parent row is deleted (via either lane):

1. Postgres applies FK `onDelete: "cascade"` — children deleted in the DB.
2. Zero's logical replication reader picks up the cascaded deletes from WAL.
3. Every connected client's replica receives the deletions and any subscribed `useQuery` re-renders.

Caveats:

- **Local replica has a small window of "orphans"** after an optimistic Zero mutator runs: the parent is gone from the replica but cascaded children haven't arrived yet (few hundred ms). In practice invisible because chat-bound UIs navigate away, and ZQL joins through the parent filter orphans out.
- **If a UI is actively observing child rows by id** while the parent is deleted, consider optimistically deleting children in the mutator. Rare. Skip it until you see the bug.

---

## Common pitfalls (learned the hard way)

1. **Don't block the UI on `.server`.** Fire-and-forget + background error toast is the default. `.server` awaits the full network round-trip (~500ms–1s).
2. **Don't manually cascade in the mutator.** Let Postgres + replication handle it. ztunes and zbugs both do this.
3. **Don't use `tx.location` branching** for "row not found" cases — silent `return` works on both sides.
4. **Don't override padding or other primitive-contract classes** with concrete utilities in places where a conditional variant depends on them. (Out of scope for this doc — mentioned here because `tailwind-merge` conflict behavior bit us during the sidebar delete UI work. See `apps/web/src/components/shell/sidebar/app-sidebar.tsx`.)
5. **If a 500 hits `/api/zero/mutate`**, check three suspects in order:
   - **API not redeployed** — `mustGetMutator(mutators, "chats.delete")` throws synchronously if the deployed handler's `mutators` object doesn't include the new mutator. Ensure `apps/server` is deployed after any new mutator is added to `packages/zero/src/mutators.ts`.
   - **Zero-cache `ZERO_MUTATE_URL` misconfig** — if local web points at Railway zero-cache and that zero-cache points at prod API, mutations hop environments. Point local web at a local zero-cache, or deploy first.
   - **Mutator body threw** — check `console.error("[zero mutate] handleMutateRequest threw", …)` in `apps/server/src/api/internal/zero.ts` for the stack.

---

## Decision cheat sheet

Answer in order:

1. **Does any non-web client need this write?** Mobile, webhook, cron. → Add a **REST endpoint**.
2. **Is the row Zero-replicated (in our Drizzle schema, exposed in `packages/zero`)?** → Add a **Zero mutator** too, so web gets optimistic UX.
3. **Is it purely ephemeral / one-shot** (send email, kick off workflow, rotate token) with no synced row to update? → REST only.
4. **Is it a quick web-only interaction with no mobile story** (draft autosave, UI-only toggle persisted to DB)? → Zero mutator only is fine; you can always add a REST layer later.

Both lanes should share a single `packages/server-data/*/mutations.ts` function so the DB contract doesn't diverge.

---

## Related docs

- **[Data fetching](../data-fetching/SKILL.md)** — Zero vs TanStack Query for reads.
- `.agents/skills/rocicorp-zero/writing/` — generic Zero mutator / push protocol docs.
- `.sandbox/ztunes/zero/mutators.ts` — closest analog (simple cart.remove with ownership-by-filter).
- `.sandbox/mono/apps/zbugs/shared/mutators.ts` + `server-mutators.ts` — advanced pattern with shared + server-override mutators and structured `MutationError`.
- `packages/zero/AGENTS.md` — how to add Zero queries / mutators, `bun zero:generate`.
- `apps/server/AGENTS.md` — server routing + middleware chain.
