# ZQL — overview

**ZQL** (Zero Query Language) is how you **read** replicated data in Zero. It is **not** raw SQL strings sent from the browser. Queries are built in **TypeScript** with a **fluent builder** (similar in spirit to Drizzle or Kysely): you chain clauses starting from a **root table** on the shared **`zql`** object exported from your schema module.

## Where ZQL runs

- **Client** — ZQL evaluates against the **local store** first (instant UI).
- **`zero-cache`** — The **authorized** ZQL your server returns for a named query runs against the **SQLite replica**.

Same expression shape is reused in both places whenever you **share** query definitions between client and server.

## Whole rows, not column projections

ZQL selects **entire rows** for matching tables. There is **no** “pick these columns only” mode. Zero trades raw payload size for **reuse**: one hydrated row can satisfy multiple overlapping queries and keeps **types** shared across the app.

Treat returned rows as **immutable** (`readonly` in types). Cached row objects may be **shared**; mutating them in place corrupts every consumer. **Clone** before changing.

## Named queries vs raw ZQL

Product code usually exposes **named queries** (`defineQuery` / `useQuery`). Those functions **return ZQL** (or builder chains) under the hood. You still write **ZQL** inside query mutator bodies, server resolvers, and **local-only** subscriptions when you do not want a server round-trip per keystroke.

## This folder

| Topic                                                          | File                                             |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `zql` builder, `createBuilder`, selecting a table              | [builder-select.md](builder-select.md)           |
| `orderBy`, `limit`, `start`, `one`                             | [order-limit-page.md](order-limit-page.md)       |
| `where`, operators, `null`, compounds, `cmpLit`, `whereExists` | [where-and-exists.md](where-and-exists.md)       |
| `related`, nested `related`, junction limits                   | [relationships.md](relationships.md)             |
| `flip` for join order, scalar subqueries                       | [planning-scalar.md](planning-scalar.md)         |
| `QueryResultType`, inspecting plans                            | [types-and-inspector.md](types-and-inspector.md) |
| `ZQLDatabase`, server transactions, adapters                   | [server-zql.md](server-zql.md)                   |

## Package reference

**`out/zql/src/query/`** — builder, `zql` export, expression layer. Execution / planning: **`out/zql/src/planner/`**, **`out/zql/src/ivm/`**. Server Postgres entry: **`out/zero-server/src/`** (`ZQLDatabase`, adapters).

## Further reading (official)

- [ZQL](https://zero.rocicorp.dev/docs/zql)
- [ZQL on the Server](https://zero.rocicorp.dev/docs/server-zql)
