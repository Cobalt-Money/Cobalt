# Writing data (mutators)

**Mutators** are named, typed write handlers. They run **optimistically** on the **local store**, then **authoritatively** on the **server** in **Postgres**. Changes **replicate** to `zero-cache` and flow to **subscribers** as row updates.

Detail lives in **`writing/`** (same pattern as **`reading/`**).

## Chapters

1. **[writing/overview.md](writing/overview.md)** — life of a mutation, client vs server copies, reconciliation
2. **[writing/defining-mutators.md](writing/defining-mutators.md)** — `defineMutator`, `defineMutators`, `tx.mutate` (insert / upsert / update / delete), `await`, args + validators, **`tx.run`** reads, **`tx.location`**, **`ctx`**
3. **[writing/server-push.md](writing/server-push.md)** — **`ZERO_MUTATE_URL`**, `handleMutateRequest`, thrown mutators, HTTP **401/403** vs other errors, **`mutateURL`**, **`URLPattern`**, server overrides, **raw SQL**
4. **[writing/running-results.md](writing/running-results.md)** — `zero.mutate`, **`.client`** / **`.server`** promises, read-after-write, client-generated IDs
5. **[writing/permissions-async.md](writing/permissions-async.md)** — permissions as code, outbox for notifications, impure mutators

## Short summary

- **Always `await`** `tx.mutate.*` calls inside mutators.
- **Args** are untrusted on the server — validate. **Identity** belongs in **`ctx`**, not args.
- **`tx.run` in mutators** is **local-only** on the client (cached rows); on the server it sees full DB state for that transaction.
- **`zero.mutate` returns promises** — use **`.client`** before assuming a follow-up **`zero.run`** sees the write locally; use **`.server`** when you need server confirmation.
- Register mutators on the **`Zero` instance** — unregistered mutators **throw** (sync + conflict resolution depend on the registry).

## Cross-links

- Reads that hydrate the local store: [reading.md](reading.md)
- Auth alignment: [authentication.md](authentication.md)
- Topology: [deployment.md](deployment.md)

## Package reference

Each page under **`writing/`** ends with a **Package reference**. Broadly: **`out/zql/src/mutate/`** (mutator definitions), **`out/zero-server/src/`** (`process-mutations`, push), **`out/zero-client/src/client/`** (`mutate`, reconciliation).

## Further reading (official)

- [Mutators](https://zero.rocicorp.dev/docs/mutators)
