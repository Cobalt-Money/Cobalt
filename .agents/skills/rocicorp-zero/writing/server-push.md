# Server setup: mutate endpoint and push behavior

Mutations reach Postgres through your **`mutate`** HTTP endpoint. **`zero-cache`** uses **`ZERO_MUTATE_URL`** to find it.

## `ZERO_MUTATE_URL`

Typical dev wiring:

```bash
export ZERO_MUTATE_URL="http://localhost:3000/api/zero/mutate"
```

Your framework exposes a route that forwards the **`Request`** into Zero’s helpers and returns the JSON response.

## Implementing the handler

Zero provides **`handleMutateRequest`** plus **`mustGetMutator`** (registry lookup). You plug in a **`dbProvider`** / transaction adapter appropriate for your Postgres driver (see official **ZQL on the Server** and install guides).

High level:

1. Authenticate the request and build **`ctx`**.
2. Run **`handleMutateRequest`** so each queued mutation executes inside your **`transact`** callback.
3. Return the serialized result as **HTTP 200** when the handler succeeds.

## When a mutator throws

If an individual mutator **throws**, **`handleMutateRequest`** **skips** that mutation and continues with the rest. The **optimistic** client effect for that mutation is **reverted**. The error is available in structured form on the client so you can show toasts — see [running-results.md](running-results.md).

## HTTP status codes and the sync connection

Behavior described in the official docs:

- Responses **other than** **200**, **401**, or **403** can cause the client to **disconnect** and enter an **error** connection state (treat as serious misconfiguration or server outage).
- **401** / **403** put the client into a **needs auth** state: you typically **`zero.connection.connect()`** (manual reconnect) and mutations **retry** after re-auth.

If you need different semantics, you can implement a **custom** mutate endpoint following the push protocol (advanced).

## Per-client `mutateURL`

List **comma-separated** URLs in `ZERO_MUTATE_URL` and set **`mutateURL`** on the **`Zero` constructor** for a specific client (staging vs prod, branch previews).

## `URLPattern` allowlists

Same idea as query URLs: each entry can be a **`URLPattern`** string so only matching preview hosts are valid. See [reading/server-and-urls.md](../reading/server-and-urls.md) for the mental model.

## Server-specific mutator implementations

**Override** shared mutators on the server:

- Pass **`defineMutators(sharedMutators, { ...overrides })`** so names match but server code adds audit tables, stricter checks, or extra writes.
- Or branch on **`tx.location === "client"`** vs **`"server"`** inside one mutator for small differences.

On the server, **`tx`** narrows to **`ServerTransaction`** when you need server-only APIs.

## Raw SQL (`dbTransaction`)

On **`ServerTransaction`**, **`tx.dbTransaction`** exposes the underlying DB connection so you can run **raw SQL** for features ZQL does not cover yet. **Guard with `tx.location === "server"`** so client bundles never execute that path.

## Package reference

**`out/zero-server/src/`** — `handleMutateRequest` and mutation pipeline (search **`*.d.ts`**). Often alongside **`process-mutations`** / **`push-processor`** modules. Wire types: **`out/zero-protocol/`**.

## Further reading (official)

- [Server setup](https://zero.rocicorp.dev/docs/mutators#server-setup)
- [`ZERO_MUTATE_URL`](https://zero.rocicorp.dev/docs/zero-cache-config#mutate-url)
- [Handling errors](https://zero.rocicorp.dev/docs/mutators#handling-errors)
- [Server-specific code](https://zero.rocicorp.dev/docs/mutators#server-specific-code)
- [Dropping down to raw SQL](https://zero.rocicorp.dev/docs/mutators#dropping-down-to-raw-sql)
- [ZQL on the Server](https://zero.rocicorp.dev/docs/server-zql)
- [Preview deployments](https://zero.rocicorp.dev/docs/preview-deployments)
