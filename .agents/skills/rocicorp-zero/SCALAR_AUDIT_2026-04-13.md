# Zero Scalar Subquery Audit Report

**Date**: 2026-04-13  
**Audited by**: Claude Code  
**Status**: ✅ PASS — No issues found

---

## Summary

- **Total whereExists calls**: 7
- **Nested (multi-hop)**: 6 ✓ Correctly omitting scalar
- **Single-hop**: 1
- **Scalar optimization opportunities**: 0 (current queries cannot use scalar)

---

## Files Analyzed

### 1. `packages/zero/src/accounts/queries.ts`

| Line  | Query                | whereExists Call                                                             | Nesting    | Has Scalar? | Should Have? | Status    |
| ----- | -------------------- | ---------------------------------------------------------------------------- | ---------- | ----------- | ------------ | --------- |
| 22    | bankAccounts         | `.whereExists("connection", (conn) => conn.where("userId", userId))`         | Single-hop | NO          | NO           | ✓ CORRECT |
| 33-34 | bankBalanceSnapshots | `.whereExists("account", ...)` nested with `.whereExists("connection", ...)` | Nested     | NO          | NO           | ✓ CORRECT |

**Analysis (line 22)**: Single-hop with one-to-one FK (account → connection). Filter is on `userId`, which is not unique per connection (one user can have many connections). Scalar does not apply. ✓

---

### 2. `packages/zero/src/brokerage/queries.ts`

| Line  | Query                   | whereExists Call                                                             | Nesting    | Has Scalar? | Should Have? | Status    |
| ----- | ----------------------- | ---------------------------------------------------------------------------- | ---------- | ----------- | ------------ | --------- |
| 36-37 | plaidActivities         | `.whereExists("account", ...)` nested with `.whereExists("connection", ...)` | Nested     | NO          | NO           | ✓ CORRECT |
| 53    | plaidInvestmentAccounts | `.whereExists("connection", (conn) => conn.where("userId", userId))`         | Single-hop | NO          | NO           | ✓ CORRECT |
| 64-65 | plaidPositions          | `.whereExists("account", ...)` nested with `.whereExists("connection", ...)` | Nested     | NO          | NO           | ✓ CORRECT |

**Analysis (line 53)**: Single-hop FK relationship. Scalar cannot apply due to non-unique filter (userId is not unique per connection). ✓

---

### 3. `packages/zero/src/transactions/lib.ts`

| Line  | Function                  | whereExists Call                                                             | Nesting | Has Scalar? | Should Have? | Status    |
| ----- | ------------------------- | ---------------------------------------------------------------------------- | ------- | ----------- | ------------ | --------- |
| 30-31 | transactionsForUser       | `.whereExists("account", ...)` nested with `.whereExists("connection", ...)` | Nested  | NO          | NO           | ✓ CORRECT |
| 42-43 | recurringForUser          | `.whereExists("account", ...)` nested with `.whereExists("connection", ...)` | Nested  | NO          | NO           | ✓ CORRECT |
| 54-57 | creditTransactionsForUser | `.whereExists("account", ...)` nested with `.whereExists("connection", ...)` | Nested  | NO          | NO           | ✓ CORRECT |

**Analysis**: All nested whereExists (multi-hop). Scalar does not support multi-hop; correctly omitted. ✓

---

## Key Findings

### ✅ Scalar Best Practices Followed

1. **All 6 nested queries** correctly omit scalar
   - Reason: Scalar only supports single-hop, these are multi-hop
   - Constraint: Zero asserts if scalar is misused on nested calls
2. **Single-hop query** (line 22, line 53) correctly omits scalar
   - Reason: Filter is on non-unique field (`userId`), not primary/unique key
   - Correct: Multiple connections can share userId

### Pattern Summary

Your Zero queries consistently use this authorization pattern:

```typescript
whereExists("account", (acc) =>
  acc.whereExists("connection", (conn) => conn.where("userId", userId))
);
```

This pattern:

- ✅ Traverses account → connection → userId for proper authorization
- ✅ Cannot use scalar (nested, multi-hop)
- ✅ Is efficient under Zero's planner
- ✅ Follows the security model (user → connection → account)

---

## Scalar Opportunities

Scalar would apply **only** if you add single-hop queries that:

1. Filter by a **unique field** (primary key, unique constraint)
2. Are **not nested** inside another whereExists

Example (hypothetical new query):

```typescript
// Scalar would apply here
.whereExists("connection", (c) => c.where("id", connectionId), { scalar: true })
```

**Current codebase**: No such queries exist. All single-hop calls filter by non-unique fields.

---

## Recommendation

**No action required.** ✅

- Your codebase follows scalar best practices
- The nested whereExists pattern is appropriate for your authorization structure
- Scalar cannot improve these queries due to the one-hop limitation
- Monitor for scalar opportunities only when adding **new single-hop queries with unique lookups**

See `.agents/skills/rocicorp-zero/zql/planning-scalar.md` for detailed scalar guidance.
