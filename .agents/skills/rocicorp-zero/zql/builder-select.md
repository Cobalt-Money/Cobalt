# Builder and `select` (root table)

## Getting `zql`

If you use **schema codegen** (for example **drizzle-zero** or **prisma-zero**), your generated **`schema.ts`** typically exports a ready-made **`zql`** constant backed by `createBuilder(schema)`.

Otherwise, construct it explicitly:

```ts
export const zql = createBuilder(schema);
```

Import that **`zql`** anywhere you build queries.

## Starting a query

Every ZQL chain **roots on a table** exposed as a property of `zql`:

```ts
zql.issue;
```

That expression is already a query: “all **issue** rows I am allowed to see under current sync.” There is **no separate `select` keyword** — picking the table **is** the select.

Because ZQL returns **full rows**, you do not list columns. Permissions and replication still determine which row fields are visible in practice.

## Design consequences

- **Larger payloads** per row than hand-picked column APIs.
- **Better row reuse** in the local cache across different queries.
- **Simpler TypeScript types** — one row type per table, composed with `related()`.

## Next clauses

Chain **`where`**, **`orderBy`**, **`limit`**, **`related`**, **`one()`**, and so on after the root. See [order-limit-page.md](order-limit-page.md) and [where-and-exists.md](where-and-exists.md).

## Package reference

**`out/zql/src/query/create-builder.ts`** (and adjacent modules) — `createBuilder` and table-rooted query construction.

## Further reading (official)

- [Create a builder](https://zero.rocicorp.dev/docs/zql#create-a-builder)
- [Select](https://zero.rocicorp.dev/docs/zql#select)
