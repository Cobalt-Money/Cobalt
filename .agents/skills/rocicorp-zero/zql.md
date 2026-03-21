# ZQL (Zero Query Language)

ZQL is Zero’s **TypeScript query builder** for **reads** over the replicated schema. It is **not** ad-hoc SQL from the browser. Chains start at **`zql.tableName`** and add **`where`**, **`orderBy`**, **`limit`**, **`related`**, and so on.

Detailed topics live under **`zql/`** (same pattern as **`reading/`** and **`writing/`**).

## Chapters

1. **[zql/overview.md](zql/overview.md)** — builder mental model, whole-row design, immutability, where ZQL runs
2. **[zql/builder-select.md](zql/builder-select.md)** — `createBuilder`, `zql` export, rooting on a table
3. **[zql/order-limit-page.md](zql/order-limit-page.md)** — `orderBy`, default PK sort, `limit`, `start` (paging), `one()`
4. **[zql/where-and-exists.md](zql/where-and-exists.md)** — filters, operators, `null` / `IS`, `undefined`, compounds, `cmpLit`
5. **[zql/relationships.md](zql/relationships.md)** — `related`, refining, nesting, **`whereExists` / `exists`**, junction limits
6. **[zql/planning-scalar.md](zql/planning-scalar.md)** — `flip: true`, **scalar** subqueries
7. **[zql/types-and-inspector.md](zql/types-and-inspector.md)** — `QueryResultType`, plans, performance pointers
8. **[zql/server-zql.md](zql/server-zql.md)** — `ZQLDatabase`, Postgres transactions, adapters, SSR caveat

## Client vs server

- **Client and `zero-cache`** run ZQL against **local store** / **SQLite replica** (through named queries).
- **Server** runs the same builder against **Postgres** via **`ZQLDatabase`** — see [zql/server-zql.md](zql/server-zql.md).
- **Query resolvers** should still treat **server-returned ZQL** as the **authorization boundary** — [reading/overview.md](reading/overview.md).

## Cross-links

- [schema.md](schema.md) — tables and relationships ZQL uses
- [reading/defining-queries.md](reading/defining-queries.md) — returning ZQL from `defineQuery`
- [writing/defining-mutators.md](writing/defining-mutators.md) — `tx.run` with ZQL

## Package reference

Each page under **`zql/`** ends with a **Package reference**. Broadly: **`out/zql/src/query/`** (builder, registry), **`out/zql/src/mutate/`** (transaction writes), **`out/zql/src/planner/`** + **`out/zql/src/ivm/`** (planning / incremental view maintenance), **`out/zero-server/src/`** (`ZQLDatabase`, adapters).

## Further reading (official)

- [ZQL](https://zero.rocicorp.dev/docs/zql)
- [ZQL on the Server](https://zero.rocicorp.dev/docs/server-zql)
