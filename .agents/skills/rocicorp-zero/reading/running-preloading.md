# Running queries and preloading

Once queries are **defined** and the **server endpoint** exists, the app **runs** them in a few different ways. The choice affects **reactivity**, **whether you wait for the server**, and **how much work** the client does materializing rows.

## Reactive subscriptions — `useQuery` (React / Solid)

The usual UI path: framework hooks (**`useQuery`** in React, analogous APIs in Solid) **subscribe** to a query. While the component is mounted, the query is **active**; the hook re-renders when local or server data changes.

This is the default mental model for screens and lists. Details of hook usage: [react.md](../react.md).

## One-shot reads — `zero.run()`

Sometimes you need a **single** read without keeping a subscription open:

```ts
const results = await zero.run(queries.issues.byPriority("high"));
```

**Default behavior:** `run()` returns what is **already available on the client** — the same class of result as when **`result.type === 'unknown'`** in reactive APIs (local partial data, not necessarily server-complete).

**Wait for authoritative data:** pass **`{ type: 'complete' }`** so the promise resolves only after the **server** has answered for that query. Use this when the next step depends on **known-complete** data (for example a permission gate) rather than “best effort local.”

After `run()` finishes, the query is **deactivated** automatically (unlike a mounted `useQuery`).

## Preloading — `zero.preload()`

Most real apps **preload** data so the next screen feels instant — for example load the first thousand inbox rows at startup before the user navigates.

**Why not only `useQuery`?** Large preloads would force materializing **huge** result sets into plain JS objects if they went through the same path as screen-sized queries. **`zero.preload()`** is optimized to **warm the local store and sync pipeline** without that overhead.

Typical pattern at app bootstrap:

```ts
zero.preload(
  queries.issues.inbox({
    sort: "created",
    sortDirection: "desc",
    limit: 1000,
  })
);
```

## Preload lifecycle — `cleanup()`

`preload()` returns a handle. Call **`cleanup()`** when you no longer want that preload subscription (for example leaving a heavy admin section). That participates in the **active vs cached** behavior described in [caching-ttl.md](caching-ttl.md).

## How this ties to mutators

Mutators read the **local store**. **Preload** and **mounted `useQuery`** both contribute rows to that store. If a mutator “cannot see” related rows, often **no query has loaded them yet** — add a **preload** or ensure a **mounted** query covers that shape. See [writing/overview.md](../writing/overview.md).

## Local-only ZQL (advanced)

For patterns like **per-keystroke typeahead**, registering a new **named** server query per character is wasteful. Zero lets you pass **raw ZQL** in places that accept a query so work stays **client-local** until you have a stable search. Named queries remain the default for anything that should **sync** from the server.

## Package reference

**`out/zero-client/src/client/zero.ts`** (or adjacent client modules) — `run`, `preload`, query execution. TTL / query options: **`out/zql/src/query/`** (e.g. `ttl`-related types next to query definitions).

## Further reading (official)

- [Running queries](https://zero.rocicorp.dev/docs/queries#running-queries)
- [Preloading](https://zero.rocicorp.dev/docs/queries#for-preloading)
- [Local-only queries](https://zero.rocicorp.dev/docs/queries#local-only-queries)
