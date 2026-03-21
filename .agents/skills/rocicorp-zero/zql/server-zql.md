# ZQL on the server (Postgres)

Zero ships **server-side** utilities to run **the same ZQL shape** against **upstream Postgres** (not only SQLite in `zero-cache`). This powers **mutator reads** (`tx.run`), **custom REST** handlers, and shared validation logic.

## `ZQLDatabase` and providers

You construct a **`ZQLDatabase`** (via factories for common Postgres drivers — see the official **install** and **server** guides). Typical pattern:

```ts
await dbProvider.transaction(async (tx) => {
  // await tx.mutate...
  // await tx.query...  // ZQL execution
  // await myMutator.fn({ tx, ctx, args })
});
```

Inside **mutators**, the underlying server transaction is often reachable for advanced use as **`tx.dbTransaction.wrappedTransaction`** (exact shape depends on adapter).

## Custom database adapters

To support another Postgres client library, implement Zero’s **`DBConnection`** contract. The official repo’s **adapter** implementations are the reference for behavior (linked from the upstream doc).

## Operational note

**`ZQLDatabase` may read Postgres schema metadata before each transaction** in current versions. That is acceptable for most apps; at very high scale it could matter — watch upstream issues if you outgrow it.

## SSR

**Server-side rendering with Zero** is **not** fully wired in the framework integrations yet. Official guidance: **avoid SSR** for Zero paths; use your framework’s patterns to **skip** Zero on the server until support lands.

Client apps often use **SPA mode** (this repo’s setup calls this out elsewhere).

## How this differs from client ZQL

- **Same builder API** for queries.
- **Full database visibility** inside server transactions (no “only cached rows” limitation like client **`tx.run`** in mutators).
- Still respect **your auth** — ZQL does not replace permission checks.

## Package reference

**`out/zero-server/src/`** — `ZQLDatabase`, Postgres transaction adapters (search **`zql-database`** / **`ZQLDatabase`** in **`*.d.ts`**). Often alongside **`out/zero-pg/`** or similar adapter package inside the same install.

## Further reading (official)

- [ZQL on the Server](https://zero.rocicorp.dev/docs/server-zql)
- [Mutators — reading data](https://zero.rocicorp.dev/docs/mutators#reading-data)
- [Dropping down to raw SQL](https://zero.rocicorp.dev/docs/mutators#dropping-down-to-raw-sql)
