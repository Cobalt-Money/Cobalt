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

Example idea: instead of joining **issues → project** just to test **`project.name = 'zero'`**, Zero can **pre-resolve** the project id once and rewrite to **`where('projectId', resolvedId)`**.

Enable with **`{ scalar: true }`** on **`whereExists`** or the **`exists`** helper.

### Requirements and tradeoffs

- The inner query must be provably **at most one row** (typically constrained by a **unique** key). Zero **throws** if uniqueness cannot be guaranteed.
- When the scalar target **changes**, the outer query must be **rehydrated** (re-run). Good for **stable** lookups (project id, user id). **Poor** for rapidly changing targets.
- Scalar subqueries are **not fully integrated** with the planner yet — you choose when to apply them.

## Package reference

**`out/zql/src/planner/`** — join order and plan shaping. **`out/zql/src/ivm/`** — incremental maintenance of views. Builder options (`flip`, `scalar`): **`out/zql/src/query/`**.

## Further reading (official)

- [Manually flipping joins](https://zero.rocicorp.dev/docs/zql#manually-flipping-joins)
- [Scalar subqueries](https://zero.rocicorp.dev/docs/zql#scalar-subqueries)
