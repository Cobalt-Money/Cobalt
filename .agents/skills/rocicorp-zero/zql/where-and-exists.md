# `where`, operators, compounds, and existence

## Basic `where`

Filter on a **column name** (string). TypeScript narrows valid column names from your **Zero schema**.

```ts
zql.issue.where("priority", "=", "high");
```

### Default operator is `=`

```ts
zql.issue.where("priority", "high");
```

## Supported operators (summary)

| Operator family                          | Typical operand types   | Notes                                               |
| ---------------------------------------- | ----------------------- | --------------------------------------------------- |
| `=`, `!=`                                | boolean, number, string | JavaScript **strict** equality semantics            |
| `<`, `<=`, `>`, `>=`                     | number                  | Numeric compare                                     |
| `LIKE`, `NOT LIKE`, `ILIKE`, `NOT ILIKE` | string                  | SQL-style patterns                                  |
| `IN`, `NOT IN`                           | boolean, number, string | RHS is an **array**; membership via strict equality |
| `IS`, `IS NOT`                           | includes `null`         | **Only** correct way to test `null` (see below)     |

TypeScript blocks nonsense (for example `>` on boolean).

## `null` — SQL semantics

Normal comparisons to **`null`** are **always false** in ZQL (like SQL), including `null = null` and `null != null`.

Use **`IS`** / **`IS NOT`** when you intend null checks:

```ts
zql.employee.where("orgID", "IS", null);
```

## `undefined` in `where`

Passing **`undefined`** as a compared value makes the predicate **always false** — the query returns **no rows**. This is a convenience for optional filters; it is easy to misuse and “lose” data silently if your optional value is unexpectedly undefined.

## Chained `where` = `AND`

```ts
zql.issue.where("priority", ">=", 3).where("owner", "aa");
```

Each chained `where` is **AND**ed with the previous filters.

## Compound expressions

Pass a **callback** that receives helpers **`cmp`**, **`and`**, **`or`**, **`not`**:

```ts
zql.issue.where(({ cmp, and, or, not }) =>
  or(
    cmp("priority", "critical"),
    and(cmp("priority", "medium"), not(cmp("numVotes", ">", 100)))
  )
);
```

**`cmp`** is like `where` but for use **inside** expressions (no chaining on `cmp` itself).

Inside the same callback bag you also get **`exists`** for relationship tests — see [relationships.md](relationships.md).

## Comparing literals vs columns

The first argument to `where` / `cmp` is always a **column name**. To compare **two literals** (or a literal to **context**), use **`cmpLit`** from the Zero APIs — common in **read permissions**. **`ctx`** must be in scope from the enclosing query resolver (it is not passed into the `where` callback):

```ts
zql.issue.where(({ cmpLit }) => cmpLit(ctx.role, "admin"));
```

Confirm the **`cmpLit` import** for your Zero version in the official ZQL doc.

## Relationship existence — preview

**`whereExists('relation', subQuery?)`** filters rows that have **at least one** related row matching an optional nested ZQL. Full detail: [relationships.md](relationships.md).

## Package reference

**`out/zql/src/query/`** — `where`, comparison helpers, `cmpLit`, compound / `exists` APIs (module names vary; search **`whereExists`** / **`cmpLit`** under **`out/zql/src/query/`**).

## Further reading (official)

- [Where](https://zero.rocicorp.dev/docs/zql#where)
- [Comparison operators](https://zero.rocicorp.dev/docs/zql#comparison-operators)
- [Comparing to `null`](https://zero.rocicorp.dev/docs/zql#comparing-to-null)
- [Comparing to `undefined`](https://zero.rocicorp.dev/docs/zql#comparing-to-undefined)
- [Compound filters](https://zero.rocicorp.dev/docs/zql#compound-filters)
- [Comparing literal values](https://zero.rocicorp.dev/docs/zql#comparing-literal-values)
