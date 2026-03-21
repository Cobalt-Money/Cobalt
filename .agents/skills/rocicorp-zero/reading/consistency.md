# Consistency, sorts, and preload strategy

Zero syncs a **consistent partial replica** — still, **how** you preload and **how** you sort affects whether local rows appear as a **prefix** of the eventual server result or whether the list **jumps** when the server responds.

## Prefix property (same query shape)

Picture tens of thousands of issues. You **preload** the first **1,000** issues sorted by **created time descending**.

Later the user runs a query: **“issues assigned to me”**, also sorted by **created descending**. Suppose **100** of those assignments already sit inside the preloaded 1,000.

Because **sort keys align**, those 100 local rows form a **prefix** of the full server answer: anything the server adds for that query will sort **below** what the user already sees. The UI feels stable — **no reordering shock** when the server completes.

## When sorts disagree — visual “shuffle”

Now switch the UI to **sort by modified descending**. Locally you may still find matches in the old preload, but they are **unlikely** to be a prefix of the server’s true ordering for the new sort. When the authoritative result arrives, rows can **jump** — users perceive flicker or instability.

**Mitigation:** For **each sort order** you expect users to use, **preload** the first **N** rows for that **same shape** (often the **unfiltered** base list in each sort). You are not duplicating row storage on disk in a wasteful way — Zero syncs the **union** of active query results, not redundant copies of identical rows.

## Future consistency model

The official docs note a **future** behavior: Zero may refuse to show local rows when they are **not known** to be a safe prefix of the server result, reducing the need to preload purely for **UX stability** (preload would then skew toward **performance** only). Until that ships, plan preloads around **sorts and filters** you actually ship.

## Practical checklist

- List the **sort options** exposed in the UI for your heaviest collections.
- For each sort, decide whether you need a **startup preload** of the top **N** rows (same unfiltered or representative filter).
- After changing default sorts, revisit preloads — otherwise the first customer action after launch hits a **shuffle**.

## Package reference

Behavior is split across **`out/zql/src/query/`** (ordering / prefix semantics in the builder) and **`out/zql/src/ivm/`** + **`out/zql/src/planner/`** (how results are maintained). Start from query builder types, then follow imports into IVM.

## Further reading (official)

- [Consistency](https://zero.rocicorp.dev/docs/queries#consistency)
