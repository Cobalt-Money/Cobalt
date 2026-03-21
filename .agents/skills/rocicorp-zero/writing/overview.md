# Writing data — overview

**Mutators** are how applications **write** through Zero: named, typed functions that run **optimistically on the client**, then **authoritatively on the server** against **Postgres**. Replication and query subscriptions propagate changes to everyone else.

This folder splits the topic like the **reading/** guides: definitions, server endpoint, invocation, errors, and server-only patterns.

## Two copies of each mutator

As with queries, each mutator conceptually exists **on the client** and **on the server**:

- **Shared code** is common in full-stack apps (one module imported into client and server bundles).
- Implementations **may differ**: the server can add **checks**, **audit logging**, **raw SQL**, or calls to other systems the browser must not perform.

## Life of a mutation (timeline)

1. **Invoke** — UI calls `zero.mutate(mutators.some.path({ ...args }))`.
2. **Client transaction** — The mutator runs **immediately** against the **local datastore** inside a transactional `tx`. Open queries update; the user sees the optimistic result in the same frame (mutators are `async` for API symmetry, not because the client is slow).
3. **Push** — Zero sends a **record** of the mutator name + validated args to your server’s **mutate** endpoint (`zero-cache` participates in the push flow as documented).
4. **Server transaction** — The server runs the **server-side** mutator in a **database transaction**, persists changes to **Postgres**, and records that the mutation applied.
5. **Replication** — Committed rows flow to **`zero-cache`** via logical replication; active queries are updated; **row deltas** reach clients.
6. **Reconciliation** — Clients apply server-backed updates. **Pending** mutations that are now confirmed have their **local optimistic overlay** rolled back in favor of authoritative state; UI reflects final truth.

If the **server** rejects a mutation, the client **reverts** the optimistic effect (per library behavior)—design visible error UX.

## Why mutators are `async`

On the **client**, mutators usually finish in **milliseconds**—still **`async`** because the **`tx`** API matches the server: on the server, reads/writes through `tx` go to **Postgres**.

## Where to go next

| Topic                                                                                     | File                                         |
| ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| `defineMutator`, `defineMutators`, `tx.mutate`, `tx.run`, `ctx`, validators               | [defining-mutators.md](defining-mutators.md) |
| `ZERO_MUTATE_URL`, handlers, errors, `mutateURL`, `URLPattern`, server overrides, raw SQL | [server-push.md](server-push.md)             |
| `zero.mutate`, `.client` / `.server` promises, read-after-write                           | [running-results.md](running-results.md)     |
| Permissions style, outbox / async side effects                                            | [permissions-async.md](permissions-async.md) |

## Package reference

**`out/zql/src/mutate/`** — mutator definitions, `ServerTransaction` / `ClientTransaction`. **`out/zero-server/src/`** — push and mutation processing (`process-mutations`, `push-processor` or equivalent in your version). **`out/zero-client/src/client/`** — `mutate`, optimistic application.

## Further reading (official)

- [Mutators](https://zero.rocicorp.dev/docs/mutators)
