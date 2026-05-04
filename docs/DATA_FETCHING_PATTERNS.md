# Data Fetching Patterns: Zero.js Learning Reference

**Date:** 2026-04-15  
**Context:** Analysis of `z.run()` vs `z.preload()`, TanStack Router preloading, and command menu optimization

---

## Core Concepts

### Three Ways to Load Data in Zero.js

#### 1. `z.run()` — One-shot sync

```typescript
await zero.run(queries.transactions.all());
```

**Behavior:**

- Syncs data from server to local cache **once**
- Query **deactivates immediately** after returning
- Stops syncing (no live updates from server)
- Default TTL: `5m` (data cached for 5 minutes after deactivation)

**Resource cost:** Minimal (one-time sync, then stops)

**Use when:**

- You need fresh data for a specific moment
- Data won't change during user interaction (snapshots, searches)
- Route loaders (preload before navigation)
- One-shot reads

---

#### 2. `z.preload()` — Background warm-up

```typescript
const handle = zero.preload(queries.transactions.all(), { ttl: "5m" });
// Later...
handle.cleanup();
```

**Behavior:**

- Syncs data from server to local cache
- Query **stays ACTIVE** until you call `cleanup()`
- **Keeps syncing** — server updates arrive automatically
- Default TTL: `none` (no cache after cleanup)
- Returns a handle: `{ cleanup: () => void, complete: Promise<void> }`

**Resource cost:** High (keeps subscription active on server + client memory)

**Use when:**

- You want data to stay **fresh** over time
- Server updates should reach the cache
- You have a known lifecycle (modal open → close)
- Startup bootstrapping of important data

---

#### 3. `useQuery()` — Component subscription

```typescript
const [data] = useQuery(queries.transactions.all());
```

**Behavior:**

- **Component subscribes** to query
- Data synced if not already cached
- Reads from cache (instant if warm)
- Auto re-renders when data changes
- Deactivates when component unmounts

**Resource cost:** Medium (active while component mounted)

**Use when:**

- Rendering data in a component
- You need reactive updates
- Data is actively displayed

---

## Stale Data: The Critical Difference

### Timeline Example: User navigates 5 minutes after preload

**Scenario A: Using `z.run()` at app startup**

```
2:00:00 PM → z.run(queries.transactions.all())
            ✅ Syncs fresh data
            ❌ Query deactivates immediately

2:00:05 PM → Server adds new transaction
            ❌ Cache doesn't receive it (query inactive)

2:05:00 PM → User navigates to Transactions page
            const [transactions] = useQuery(...)
            ❌ Shows 5-minute-old data (STALE)
            → useQuery subscribes, fetches fresh data
            → Component re-renders (FLICKER)
```

**Scenario B: Using `z.preload()` at app startup**

```
2:00:00 PM → z.preload(queries.transactions.all())
            ✅ Syncs fresh data
            ✅ Query stays ACTIVE

2:00:05 PM → Server adds new transaction
            ✅ Cache receives it automatically

2:05:00 PM → User navigates to Transactions page
            const [transactions] = useQuery(...)
            ✅ Shows current data (FRESH)
            → No flicker, no delay
```

---

## Resource Cost: Why You Can't Preload Everything

From Zero docs:

> "Queries are not free: each one consumes **client memory**, **metadata in `zero-cache`**, and **disk** for materialized state."

### Real-World Example: ztunes

```typescript
// They DON'T preload all 88k artists
// They preload only the 1k most popular (covers 80% of searches)
z.preload(queries.artistPreload(), { ttl: "1m" });
```

**Why?**

- Keeping 88k artists active = massive server/client overhead
- Keeping 1k popular artists active = reasonable tradeoff
- For rare queries, server handles them on-demand

### Resource Comparison

| Pattern       | Server Cost                | Client Cost        | Best For                      |
| ------------- | -------------------------- | ------------------ | ----------------------------- |
| `z.run()`     | One-time                   | None after         | Snapshots, one-shot reads     |
| `z.preload()` | Continuous (until cleanup) | IndexedDB + memory | Important data, collaboration |
| `useQuery()`  | While mounted              | While mounted      | Rendered data                 |

---

## Cleanup & TTL: The Safety Pattern

### Best Practice: Strict Cleanup + Short TTL Fallback

From ztunes explanation:

```typescript
z.preload(queries.artistPreload(), {
  ttl: "1m", // Safety net in case cleanup fails
});
```

**The reasoning:**

- **Trust cleanup** for normal operation (resources freed immediately)
- **Trust TTL** as fallback (in case cleanup gets missed)
- Don't rely on TTL alone (wasteful)
- Don't skip TTL entirely (risky)

### Cleanup Lifecycle Example

```typescript
const handle = useRef<{ cleanup: () => void } | null>(null);

// When entering search
const enterSearch = useCallback(() => {
  if (!handle.current) {
    handle.current = zero.preload(query, { ttl: "5m" });
  }
}, []);

// When LEAVING search (strict cleanup)
const leaveSearch = useCallback(() => {
  handle.current?.cleanup();
  handle.current = null;
  // Resources freed immediately ✅
}, []);

// Component unmount fallback
useEffect(() => {
  return () => {
    handle.current?.cleanup(); // Safety net
  };
}, []);
```

---

## TanStack Router Integration

### Route Loaders with `z.run()`

TanStack Router automatically runs loaders when you call `router.preloadRoute()`:

```typescript
// In route loader
loader: ({ context }) => {
  context.zero.run(queries.accounts.bankAccounts());
  // ✅ Syncs data before component renders
  // ✅ Component then subscribes with useQuery()
};

// From command menu or InstantLink
router.preloadRoute({ to: "/accounts" });
// ✅ Triggers loader (z.run)
// ✅ Data ready when component mounts
// ✅ useQuery reads from warm cache
```

**Why this works:**

1. `z.run()` syncs data immediately (fresh)
2. `router.preloadRoute()` explicitly triggers this
3. By the time user navigates (100-500ms later), data is still fresh
4. `useQuery()` in component reads from cache instantly

---

## Decision Tree

### Should I use `z.run()` or `z.preload()`?

```
Is this data going to stay visible/used for a long time?
├─ YES → Does it need live updates from server?
│  ├─ YES → z.preload() (keep syncing)
│  └─ NO  → z.run() (one-shot snapshot)
└─ NO → z.run() (just need it once)

Examples:
- Search interface → z.run() (snapshot)
- Chat messages while user is reading → z.preload() (live updates)
- Route preload before navigation → z.run() (one-shot)
- Popular artists at app startup → z.preload() (keep warm)
- Transaction search in command menu → z.run() (snapshot)
```

---

## Cobalt Command Menu: Current vs Recommended

### Current Implementation (Using `z.preload()`)

```typescript
const preloadHandleRef = useRef<{ cleanup: () => void } | null>(null);

const enterSearchTransactions = useCallback(() => {
  if (!preloadHandleRef.current) {
    // Keeps query active while user searches
    // Data stays fresh if new transactions arrive
    preloadHandleRef.current = zero.preload(queries.transactions.all());
  }
  setPages((p) => [...p, "search-transactions"]);
}, [zero]);

useEffect(
  () => () => {
    preloadHandleRef.current?.cleanup();
  },
  [],
);
```

**Cost:** Resources consumed while command menu is open

---

### Recommended: Simplify to `z.run()`

```typescript
const enterSearchTransactions = useCallback(() => {
  // One-shot: sync data, then search the snapshot
  // User is searching existing data, unlikely new data matters
  zero.run(queries.transactions.all());
  setPages((p) => [...p, "search-transactions"]);
}, [zero]);

// No handle management needed
// No cleanup needed
// Simpler, cheaper, sufficient for use case
```

**Reasoning:**

- Search interface doesn't need live updates
- User is filtering/searching existing data
- Unlikely they care about new transactions arriving while searching
- Snapshot search is the appropriate pattern

---

## Key Takeaways

1. **`z.run()` ≠ `z.preload()`** — Active vs deactivated queries, sync duration, freshness
2. **Stale data is real** — After `z.run()` deactivates, server updates don't reach cache
3. **Resource cost matters** — Every active query has overhead; be selective
4. **Pattern: Cleanup + TTL** — Strict cleanup for normal case, TTL as safety net
5. **Route loaders use `z.run()`** — TanStack Router's `preloadRoute()` triggers them, ideal for one-shot
6. **Search uses `z.run()`** — Snapshots don't need live syncing
7. **Startup bootstraps use `z.preload()`** — Keep important data warm (like ztunes's popular artists)

---

## References

- Zero docs: [running-preloading.md](.agents/skills/rocicorp-zero/reading/running-preloading.md)
- Zero docs: [caching-ttl.md](.agents/skills/rocicorp-zero/reading/caching-ttl.md)
- Reference app: [ztunes](https://github.com/rocicorp/ztunes) (command menu search pattern)
- TanStack Router: `router.preloadRoute()` automatically runs route loaders
