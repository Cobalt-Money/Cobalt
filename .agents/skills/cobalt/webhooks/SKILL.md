---
name: Cobalt — Webhooks
description: How to structure provider webhook handlers in apps/server/src/webhooks — thin HTTP transport, verification + SDK work in server-data, business logic in a workflow. Load when adding or refactoring a webhook receiver (Stripe, Plaid, SnapTrade, App Store, …).
version: 1.0.0
tags:
  - cobalt
  - webhooks
  - apps-server
  - vercel-workflow
---

# Webhooks (Cobalt)

Reference layout for **`apps/server/src/webhooks/**`**. Pairs with the **[Workflows](../workflows/SKILL.md)\*\* skill — webhooks are almost always the "trigger" side of a workflow.

## The contract

Every webhook handler is **thin HTTP transport**:

1. Parse the body (reject 400 on malformed JSON).
2. Verify the payload (reject 401 on bad signature).
3. Dispatch to a workflow via `start(workflow, [...])` — fire-and-forget.
4. Return `{ status: "processing" }` immediately.

That's it. No DB writes, no SDK calls, no business logic, no mapping loops in the handler. Providers have tight response-time SLAs (Apple ~5s, Stripe 10s) and are aggressive about retrying, so the handler must return fast. Retry-durability belongs to the workflow runtime, not the handler.

## Folder layout

```
apps/server/src/webhooks/
  appstore.ts       # thin transport
  plaid.ts          # thin transport (dispatch switch)
  snaptrade.ts      # thin transport (HMAC inline is fine; see below)

apps/server/src/workflows/<provider>/
  workflow.ts       # orchestration ("use workflow")
  steps.ts          # durable steps ("use step")

packages/server-data/src/<domain>/
  actions.ts        # SDK wrappers (verify, fetch, …)
  mutations.ts      # DB writes
  queries.ts        # DB reads
```

## Where each concern lives

| Concern                               | Home                                                            |
| ------------------------------------- | --------------------------------------------------------------- |
| Parse JSON + header reads             | `apps/server/src/webhooks/<provider>.ts`                        |
| Signature verification (SDK-heavy)    | `packages/server-data/src/<domain>/<verify>.ts` — an **action** |
| Signature verification (trivial HMAC) | Inline in the handler is acceptable (see SnapTrade)             |
| Dispatch decision (switch on event)   | Handler (small) OR workflow entry (preferred if > ~5 branches)  |
| DB writes                             | `packages/server-data/.../mutations.ts`                         |
| Business logic / side-effects         | Workflow steps (`"use step"`)                                   |

**Rule of thumb:** if verification imports a vendor SDK, a root certificate, or module-scoped setup — it belongs in server-data as an action. Keep the handler free of Apple/Stripe/Plaid types.

## Handler skeleton

```ts
import {
  verifyAppStoreNotification,
  AppStoreVerificationError,
} from "@cobalt-web/server-data/subscriptions";
import { Hono } from "hono";
import { start } from "workflow/api";

import { appstoreWebhookWorkflow } from "../workflows/appstore/workflow.js";

export const appstoreWebhookRouter = new Hono().post("/", async (c) => {
  const body = await c.req.json();
  const { signedPayload } = body;
  if (typeof signedPayload !== "string") {
    return c.json({ error: "Missing signedPayload" }, 400);
  }

  try {
    const { notificationType, transaction } =
      await verifyAppStoreNotification(signedPayload);

    if (notificationType === "TEST") return c.json({ status: "ok" });
    if (!transaction) return c.json({ status: "no_transaction_info" });

    await start(appstoreWebhookWorkflow, [
      { notificationType, ...transaction },
    ]);
    return c.json({ status: "processing" });
  } catch (error) {
    if (error instanceof AppStoreVerificationError) {
      return c.json({ error: "Signature verification failed" }, 401);
    }
    console.error("[appstore] error:", error);
    return c.json({ status: "error" }); // 200 — don't let provider retry on our bugs
  }
});
```

## Verification rules

- **Custom error class from server-data.** Don't leak the SDK's exception type (e.g. `VerificationException`) across the package boundary. Wrap it in `<Provider>VerificationError extends Error` and export only that.
- **401 only on signature failure.** Any other caught error returns **200**, so the provider doesn't enter exponential retry for what's often a transient bug of ours. Log + investigate via platform logs.
- **400 only on pre-verification malformed input** (missing body, wrong shape) — before you know if the signature is even good.

## Event dispatch patterns

- **Single-event providers** (App Store — always one signed payload): one workflow, one `start()` call. Let the workflow branch on `notificationType`.
- **Multi-event providers** (Plaid webhook types × codes, SnapTrade 8+ event types): the handler may `switch` on the top-level event type and `start()` the matching workflow. Keep the switch **dispatch-only** — no per-branch DB work, no mappers. Reference: `apps/server/src/webhooks/plaid.ts`, `apps/server/src/webhooks/snaptrade.ts`.

## Webhooks as notifications

Echoing the Workflows skill: most provider webhooks are **notifications, not payloads**. The body carries event type + ids + flags, not the thing that changed. So:

- **Never persist webhook body fields directly.** The transaction info Apple signs is the exception; Plaid/SnapTrade payloads are almost entirely metadata.
- **The first step inside the workflow re-fetches state from the provider API.** This is what makes the handler+workflow pair tolerant of dropped, duplicated, or replayed webhooks.

## Idempotency

Webhooks can fire twice. Don't paper over this with handler-level dedup (no Redis TTL counters, no "have I seen this request-id" tables). Rely on:

- Unique constraints on the DB columns you upsert by (see the **Persistence patterns** section in the Workflows skill).
- Workflow steps that are themselves idempotent (refetch + upsert).

## Mounting

All webhook routes mount under **`/webhooks/<provider>`** in `apps/server/src/index.ts`:

```ts
.route("/webhooks/appstore", appstoreWebhookRouter)
.route("/webhooks/plaid", plaidWebhookRouter)
.route("/webhooks/snaptrade", snaptradeWebhookRouter)
```

No user auth middleware — the signature **is** the auth.

## Env vars

Put webhook-specific env vars (bundle IDs, environment switches, webhook secrets) in `packages/env/src/server.ts` with a **one-line comment** on each: what the var is for, whether it's optional, and what "default" behavior kicks in if omitted. Reference: the `APPLE_APP_STORE_ENVIRONMENT` / `APPLE_APP_ID` block.

## Reference implementations

- **App Store (heavy SDK verification, in server-data):** `packages/server-data/src/subscriptions/appstore-verify.ts` + `apps/server/src/webhooks/appstore.ts` + `apps/server/src/workflows/appstore/`.
- **Plaid (no verification, multi-event dispatch):** `apps/server/src/webhooks/plaid.ts`.
- **SnapTrade (inline HMAC OK because it's ~10 lines of `node:crypto`):** `apps/server/src/webhooks/snaptrade.ts`. If the verification ever grows, promote it to server-data as `snaptrade/verify.ts`.

When adding a new provider, copy the shape from App Store (SDK-heavy) or Plaid (thin); don't invent a third style.
