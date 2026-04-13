# Planning: join flip and scalar subqueries

## Automatic planning

Zero **plans** ZQL (indexes, join order) automatically for most queries. When results feel slow, use the **Inspector** and **`analyze-query`** — [types-and-inspector.md](types-and-inspector.md), [debugging.md](../debugging.md).

## Manual join flip (`flip: true`)

Sometimes the **planner** would scan too many rows: for example “documents edited by user 42” when user 42 touches **few** documents but the **documents** table is huge.

**`whereExists`** (and **`exists`** in compound `where`) accept an options bag **`{ flip: true }`** to **manually flip** join direction so the engine starts from the **small** side (the user’s edits) instead of every document.

You can **`flip: true`** on **some** exists clauses and leave others automatic.

Use when you understand **cardinality**: “few children per parent” vs “huge parent set.”

## Scalar subqueries (`scalar: true`)

**Scalar** mode is an optimization for **exists**-style filters that can be rewritten as **equality on a foreign key** after resolving a **single** lookup row.

Example idea: instead of joining **issues → project** just to test **`project.name = ‘zero’`**, Zero can **pre-resolve** the project id once and rewrite to **`where(‘projectId’, resolvedId)`**.

Enable with **`{ scalar: true }`** on **`whereExists`** or the **`exists`** helper.

### ⚠️ Critical Limitation: One-Hop Only

**Scalar subqueries only support single-level `whereExists` calls.** Nested `whereExists` (multi-hop relationships) **cannot use scalar**. Zero’s source code explicitly asserts this:

```
assert(!scalar, ‘scalar option only supports one-hop relationships’)
```

If you attempt to use `scalar` on a nested `whereExists`, Zero will throw an error.

### When to Use `{ scalar: true }`

#### ✅ DO use scalar when:

**1. Filtering by primary key**

```typescript
.whereExists(“user”, (u) => u.where(“id”, userId), { scalar: true })
```

**2. Unique field constraints** (single fields or unique combinations)

```typescript
// Unique slug per org
.whereExists(“team”, (t) => t.where(“slug”, slug).where(“orgId”, orgId), { scalar: true })

// Unique userId per org membership
.whereExists(“member”, (m) => m.where(“userId”, userId).where(“orgId”, orgId), { scalar: true })
```

**3. One-to-one relationships**

```typescript
// A comment has exactly one post
.whereExists(“post”, (p) => p.where(“id”, comment.postId), { scalar: true })

// A post has exactly one team
.whereExists(“team”, (t) => t.where(“id”, post.teamId), { scalar: true })
```

**4. Authorization helpers that pin a unique ID**

```typescript
.whereExists(“member”, isMember(ctx), { scalar: true })
.whereExists(“user”, isUser(ctx), { scalar: true })
```

#### ❌ DO NOT use scalar when:

**1. Multiple rows could match** (non-unique filters)

```typescript
// WRONG - many users can be active
.whereExists(“user”, (u) => u.where(“isActive”, true), { scalar: true })

// WRONG - many members can be enabled
.whereExists(“member”, (m) => m.where(“disabled”, false), { scalar: true })
```

**2. Nested `whereExists` (multi-hop)**

```typescript
// WRONG - this is nested, scalar not supported
.whereExists(“account”, (acc) =>
  acc.whereExists(“connection”, (conn) => conn.where(“userId”, userId), { scalar: true })
)

// CORRECT - no scalar on nested calls
.whereExists(“account”, (acc) =>
  acc.whereExists(“connection”, (conn) => conn.where(“userId”, userId))
)
```

**3. Pattern/LIKE searches**

```typescript
// WRONG - pattern can match multiple rows
.whereExists(“user”, (u) => u.where(“email”, “ILIKE”, `%${search}%`), { scalar: true })
```

**4. Inside `.related()` iteration**

```typescript
// WRONG - iterating over multiple team members
.related(“teamMembers”, (q) =>
  q.whereExists(“member”, (m) => m.where(“deactivated”, false), { scalar: true })
)

// CORRECT
.related(“teamMembers”, (q) =>
  q.whereExists(“member”, (m) => m.where(“deactivated”, false))
)
```

### Codebase Example

Your current queries correctly **omit scalar** on nested calls:

```typescript
// From packages/zero/src/accounts/queries.ts - CORRECT
zql.bankBalanceSnapshot
  .whereExists(“account”, (acc) =>
    acc.whereExists(“connection”, (conn) => conn.where(“userId”, userId))
  )
  // Scalar not used because: nested whereExists, cannot use scalar
```

### Requirements and tradeoffs

- The inner query must be provably **at most one row** (typically constrained by a **unique** key). Zero **throws** if uniqueness cannot be guaranteed.
- When the scalar target **changes**, the outer query must be **rehydrated** (re-run). Good for **stable** lookups (project id, user id). **Poor** for rapidly changing targets.
- Scalar subqueries are **not fully integrated** with the planner yet — you choose when to apply them.
- **Remember: one-hop only.** If you see a nested `whereExists`, scalar is not an option.

### Audit Workflow

When adding new single-hop `whereExists` calls:

1. **Check if the inner query can return multiple rows**
   - Does it filter by a unique field? (id, unique combo)
   - If YES → scalar is applicable
   - If NO → don’t use scalar

2. **Check query nesting**
   - Is this a single `whereExists`, or nested?
   - If single AND unique → add `{ scalar: true }`
   - If nested → omit scalar, even if inner is unique

3. **Verify Zero doesn’t throw**
   - Run your queries; Zero will assert if scalar is misused

## Package reference

**`out/zql/src/planner/`** — join order and plan shaping. **`out/zql/src/ivm/`** — incremental maintenance of views. Builder options (`flip`, `scalar`): **`out/zql/src/query/`**.

## Further reading (official)

- [Manually flipping joins](https://zero.rocicorp.dev/docs/zql#manually-flipping-joins)
- [Scalar subqueries](https://zero.rocicorp.dev/docs/zql#scalar-subqueries)
