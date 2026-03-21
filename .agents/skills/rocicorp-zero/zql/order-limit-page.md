# Ordering, limits, paging, and `one()`

## `orderBy`

Add sort keys in order:

```ts
zql.issue.orderBy("priority", "desc").orderBy("created", "desc");
```

Later `orderBy` clauses are **tie-breakers** for equal preceding keys.

## Default final sort: primary key

Every ZQL query ends with a **stable tie-break**: **`orderBy(primaryKey, 'asc')`** even if you do not write it.

So:

- `zql.issue` behaves like `zql.issue.orderBy("id", "asc")` when `id` is the PK.
- `zql.issue.orderBy("priority", "desc")` implicitly adds **`orderBy("id", "asc")`** at the end.

This matters for **consistent paging** and for **consistency** with preloaded data — see [reading/consistency.md](../reading/consistency.md).

## `limit`

```ts
zql.issue.orderBy("created", "desc").limit(100);
```

Caps how many rows the query returns after sorting.

## Paging with `start()`

**`start(referenceRow)`** begins the page **after** the given row (**exclusive** by default), using the query’s **order** to know where to resume.

Typical cursor loop:

1. Build base query with `orderBy` + `limit`.
2. If you have a cursor row from the previous batch, call **`.start(lastRow)`** on the next request.
3. Stop when a batch returns fewer than `limit` rows.

**Inclusive start:** `start(row, { inclusive: true })` when you need the cursor row repeated in the next page.

## `one()` — zero or one row

Append **`.one()`** when you expect **at most one** row. The result type becomes **`Row | undefined`** instead of an array.

```ts
const row = await zql.issue.where("id", issueId).one().run();
```

**`one()` overrides `limit`** — do not rely on both together.

Use this for detail screens keyed by id after you know the id is valid, and combine with **`result.type === 'complete'`** in reactive APIs when avoiding 404 flicker — [reading/partial-results.md](../reading/partial-results.md).

## Package reference

**`out/zql/src/query/`** — `orderBy`, `limit`, `start`, `one()` methods on the builder (scan **`*.d.ts`** in that folder).

## Further reading (official)

- [Ordering](https://zero.rocicorp.dev/docs/zql#ordering)
- [Limit](https://zero.rocicorp.dev/docs/zql#limit)
- [Paging](https://zero.rocicorp.dev/docs/zql#paging)
- [Getting a single result](https://zero.rocicorp.dev/docs/zql#getting-a-single-result)
