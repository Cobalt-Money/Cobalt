# Zero.js Data Fetching Patterns: Decision Framework

A practical guide for choosing between `z.run()`, `z.preload()`, and `useQuery()` when building features with Zero.js.

---

## Quick Decision Tree

```
Is this data going to stay visible/used for a long time?
├─ YES → Does it need live updates from server?
│  ├─ YES → z.preload() (keep syncing)
│  └─ NO  → z.run() (one-shot snapshot)
└─ NO → z.run() (just need it once)
```

---

## Pattern Comparison

| Pattern       | Syncs     | Stays Active     | Live Updates | Server Cost   | Client Cost        | Best For                           |
| ------------- | --------- | ---------------- | ------------ | ------------- | ------------------ | ---------------------------------- |
| `z.run()`     | Once      | ❌ Deactivates   | ❌ No        | One-time      | Minimal            | Snapshots, searches, route loaders |
| `z.preload()` | Once      | ✅ Until cleanup | ✅ Yes       | Continuous    | IndexedDB + memory | Long-lived data, collaboration     |
| `useQuery()`  | As needed | ✅ While mounted | ✅ Yes       | While mounted | While mounted      | Rendered data, reactive updates    |

---

## When to Use Each Pattern

### `z.run()` — One-shot sync

**Use when:**

- Fetching data for a specific moment in time
- Data won't change during user interaction
- Route loaders (preload before navigation)
- Search/filter interfaces
- Snapshots or read-only operations

**Example:**

```typescript
// Search interface — snapshot data
const enterSearchTransactions = useCallback(() => {
  zero.run(queries.transactions.all());
  setPages((p) => [...p, "search-transactions"]);
}, [zero]);
```

**Cost:** Minimal. Query syncs once, then deactivates. No ongoing subscription.

---

### `z.preload()` — Background warm-up

**Use when:**

- Data needs to stay fresh over time
- Server updates should reach the cache
- You have a known lifecycle (modal open → close)
- Important data at app startup

**Example:**

```typescript
// App startup — keep popular data warm
const handle = zero.preload(queries.artistPreload(), { ttl: "1m" });

// Later, when done
useEffect(() => {
  return () => handle.cleanup();
}, []);
```

**Cost:** High. Keeps subscription active on server and client. Use sparingly.

---

### `useQuery()` — Component subscription

**Use when:**

- Rendering data in a component
- You need reactive updates as data changes
- Data is actively displayed

**Example:**

```typescript
// Component displays transactions
function TransactionsList() {
  const [transactions] = useQuery(queries.transactions.all());
  return <div>{transactions?.map(...)}</div>;
}
```

**Cost:** Medium. Active while component is mounted.

---

## Resource Cost: The Critical Constraint

From Zero docs: "Queries are not free: each one consumes **client memory**, **metadata in `zero-cache`**, and **disk** for materialized state."

### Real-World Example: ztunes

```typescript
// ❌ DON'T: Preload all 88k artists
z.preload(queries.allArtists());

// ✅ DO: Preload only 1k most popular
z.preload(queries.artistPreload(), { ttl: "1m" });
```

**Why?** Keeping 88k queries active = massive overhead. Keeping 1k popular = reasonable tradeoff.

---

## Stale Data Problem

### Scenario: User navigates 5 minutes after z.run()

```
2:00:00 PM → z.run(queries.transactions.all())
            ✅ Syncs fresh data
            ❌ Query deactivates

2:00:05 PM → Server adds new transaction
            ❌ Cache doesn't receive it (query inactive)

2:05:00 PM → User navigates to Transactions page
            ❌ Shows 5-minute-old data
            → useQuery subscribes, fetches fresh
            → Component flickers
```

**Solution:** If you need live updates, use `z.preload()` instead.

---

## TanStack Router Integration

TanStack Router automatically runs route loaders when you call `router.preloadRoute()`:

```typescript
// In route loader
loader: ({ context }) => {
  context.zero.run(queries.accounts.bankAccounts());
  // ✅ Data syncs before component renders
};

// From command menu or link
router.preloadRoute({ to: "/accounts" });
// ✅ Triggers loader (z.run)
// ✅ Data ready when component mounts
// ✅ useQuery reads from warm cache
```

**Why this works:** By the time user navigates (100-500ms), data is still fresh.

---

## Cleanup & TTL: The Safety Pattern

### Best Practice: Strict Cleanup + Short TTL Fallback

```typescript
const handle = zero.preload(query, { ttl: "5m" });

// Normal case: strict cleanup
useEffect(() => {
  return () => {
    handle.cleanup(); // Frees resources immediately ✅
  };
}, []);
```

**The reasoning:**

- **Trust cleanup** for normal operation (resources freed immediately)
- **Trust TTL** as fallback (in case cleanup gets missed)
- Don't rely on TTL alone (wasteful)
- Don't skip TTL entirely (risky)

---

## Common Patterns in Cobalt

### Route Preloading

```typescript
// In route loader
loader: ({ context }) => {
  const z = context.zero as unknown as Zero;
  z.run(queries.brokerage.accounts());
  z.run(queries.brokerage.positions());
  // ... more queries
},
```

**Pattern:** Multiple `z.run()` calls in route loader. Clean, efficient.

### Search Interface

```typescript
const enterSearchTransactions = useCallback(() => {
  zero.run(queries.transactions.all());
  setPages((p) => [...p, "search-transactions"]);
}, [zero]);

// No cleanup needed — snapshot search doesn't need live updates
```

**Pattern:** Single `z.run()` for snapshot search. No ref management.

### Reactive Data Display

```typescript
function BrokerageOverview() {
  const data = useBrokerage(); // Hook uses useQuery internally
  return <BrokerageOverviewUI {...data} />;
}
```

**Pattern:** `useQuery()` for rendered data, managed in custom hooks.

---

## Decision Checklist

Before fetching data, ask:

- [ ] Will this data be visible for a long time?
- [ ] Do users expect live updates?
- [ ] Is this a snapshot (search, filter) or live feed (chat, notifications)?
- [ ] What's the cost of stale data in this context?
- [ ] Can I use route loaders instead?

**If mostly YES → consider `z.preload()`**
**If mostly NO → use `z.run()`**
**For rendering → always use `useQuery()`**

---

## References

- [Zero.js Documentation](https://rocicorp.dev)
- [ztunes Reference App](https://github.com/rocicorp/ztunes) — Shows optimal preload patterns
- [TanStack Router Integration](https://tanstack.com/router)
- [SRI-241: Zero.js Data Fetching Patterns Learning Reference](https://linear.app/sriket/issue/SRI-241)
