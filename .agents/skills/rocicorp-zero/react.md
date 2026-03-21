# React integration

This monorepo ships a **Vite + React** app. Zero’s React package provides a **provider** and **hooks** that mirror the mental model in [reading/overview.md](reading/overview.md), [reading/running-preloading.md](reading/running-preloading.md), and [writing/overview.md](writing/overview.md) / [writing/running-results.md](writing/running-results.md).

## Provider

Wrap the part of the tree that needs sync (often the whole authenticated app shell) with Zero’s **React provider**. It constructs or receives a **Zero client** instance shared by all hooks.

**Rule:** One logical client per browser tab. Do not accidentally create a new client per route unless you mean to reset all subscriptions.

## Subscribing with hooks

Hooks (names vary by version—`useQuery` is the common pattern) **subscribe** to **named queries**. While the component is mounted, the query is **active** and the local store receives rows. See [reading/running-preloading.md](reading/running-preloading.md) for **`useQuery` vs `run` vs `preload`**, and [reading/partial-results.md](reading/partial-results.md) for **`result.type`**.

Unmounting **unsubscribes**. If you navigate away and lose data locally, that is expected unless another mounted component keeps the same query active (or you used **`preload()`** at startup — [reading/caching-ttl.md](reading/caching-ttl.md)).

## Mutations from UI events

Call **mutators** from event handlers (`onClick`, form submit). Remember:

- Optimistic updates show immediately.
- Errors should surface in UI state (toast, inline error) when the server rejects.

## Immutability

Never **mutate** the arrays/objects returned from hooks in place. Derive new structures:

```tsx
// Good: new reference
const sorted = useMemo(() => [...rows].sort(compare), [rows]);

// Bad: silent corruption
rows[0].title = "oops";
```

## Connection status in UI

Surface **offline / reconnecting / error** using the connection API Zero exposes for React. This saves hours when auth or deploys break sync—see [connection.md](connection.md).

## Where this repo wires Zero

Package exports and codegen live under [`packages/zero`](../../../packages/zero). See [`packages/zero/AGENTS.md`](../../../packages/zero/AGENTS.md) for import paths and the **generate** command after schema changes.

## Related chapters

- [reading/running-preloading.md](reading/running-preloading.md) — hooks, `run`, `preload`
- [writing/running-results.md](writing/running-results.md) — invoking mutators from event handlers
- [faq.md](faq.md) — React-specific footguns

## Package reference

**`out/zero-react/src/`** — `useQuery`, provider, and related hooks (read **`*.d.ts`** there).

## Further reading (official)

- [React](https://zero.rocicorp.dev/docs/react)
