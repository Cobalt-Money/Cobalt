# Relationships: `related`, `whereExists`, nesting

Relationships come from your **Zero schema** (edges between tables). ZQL traverses them with **`related`** and tests them with **`whereExists`** / **`exists`**.

## `related` — load children (or linked rows)

```ts
zql.issue.related("comments");
```

Results are **hierarchical**: each **issue** row includes a **`comments`** array of full comment rows.

### Multiple relationships

Chain several **`related`** calls to load several collections in one query:

```ts
zql.issue.related("comments").related("reactions").related("assignees");
```

### Refining a relationship

Pass a **second argument**: a function from the **related table’s query builder** to a more specific chain (`orderBy`, `limit`, `start`, nested `related`, …):

```ts
zql.issue.related("comments", (q) =>
  q.orderBy("modified", "desc").limit(100).start(lastSeenComment)
);
```

The inner `q` is typed as if you started from that related table (for example `zql.comment`).

### Nested `related`

```ts
zql.issue.related("comments", (q) =>
  q.orderBy("modified", "desc").limit(100).related("reactions")
);
```

You can nest arbitrarily deep — watch **performance** and **payload size**.

### Junction / many-to-many limitation

**`orderBy` and `limit` are not supported** on relationships that go through a **junction table** (many-to-many) in current Zero — attempting it throws at **runtime**. Workarounds include modeling the junction **explicitly** as its own table in the schema when you need ordered/limited edges. Track upstream issues if you hit this.

## `whereExists` — filter by related rows

```ts
zql.organization.whereExists("employees");
```

Optional second argument refines which related rows count:

```ts
zql.organization.whereExists("employees", (q) => q.where("location", "Hawaii"));
```

Nest existence checks:

```ts
zql.issue.whereExists("comments", (q) => q.whereExists("reactions"));
```

## `exists` inside compound `where`

When using the **`where(({ cmp, or, exists }) => ...)`** form, **`exists`** mirrors **`whereExists`** but composes with **`and` / `or` / `not`**:

```ts
zql.issue.where(({ cmp, or, exists }) =>
  or(cmp("priority", "high"), exists("comments"))
);
```

Refinements and options (like **`flip`** or **`scalar`**) pass as additional arguments — [planning-scalar.md](planning-scalar.md).

## Package reference

**`out/zql/src/query/`** — `related`, nested shapes, relationship filters. Schema-side relationship definitions: **`out/zero-schema/src/builder/`** (relationship builder next to table definitions).

## Further reading (official)

- [Relationships](https://zero.rocicorp.dev/docs/zql#relationships)
- [Refining relationships](https://zero.rocicorp.dev/docs/zql#refining-relationships)
- [Nested relationships](https://zero.rocicorp.dev/docs/zql#nested-relationships)
- [Relationship filters](https://zero.rocicorp.dev/docs/zql#relationship-filters)
