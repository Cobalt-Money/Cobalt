# Result types, planning, and inspection

## `QueryResultType` / `QueryRowType`

Import type helpers from **`@rocicorp/zero`** to derive TypeScript types from a **query builder expression**:

- **`QueryResultType<typeof query>`** — array result type (or whatever the query’s collection shape is after `related`).
- **`QueryRowType<typeof query>`** — **one row’s** type (useful after **`one()`** or when reasoning about elements).

This keeps UI code aligned with **nested `related`** shapes without hand-maintaining interfaces.

## Inspecting plans

Use the **Inspector** tooling described in the official **debugging** docs to view **query plans** for arbitrary ZQL. Watch for **`TEMP B-TREE`** and other signs you need **indexes** or **simpler** ZQL — [reading.md](../reading.md), [debugging.md](../debugging.md).

## Performance recap

- ZQL executes against **SQLite in `zero-cache`** and against the **local store** on the client; both inherit practical limits from **upstream Postgres** indexing for replicated data.
- Prefer **narrow `where`**, sensible **`limit`**, and **preload** strategies that match **sort order** — [reading/consistency.md](../reading/consistency.md).

## Package reference

**`out/zql/src/query/query.ts`** (or re-exports) — `QueryResultType`, `QueryRowType`. Wire / AST shapes: **`out/zero-protocol/`**. Inspector UX: **`out/zero-client/src/`** (see [debugging.md](../debugging.md)).

## Further reading (official)

- [Type helpers](https://zero.rocicorp.dev/docs/zql#type-helpers)
- [Planning](https://zero.rocicorp.dev/docs/zql#planning)
- [Inspector — analyzing query plans](https://zero.rocicorp.dev/docs/debug/inspector#analyzing-query-plans)
