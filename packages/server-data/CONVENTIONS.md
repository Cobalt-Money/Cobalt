# server-data conventions

`@cobalt-web/server-data` is the **only** sanctioned consumer of the Drizzle
`db` client (alongside `@cobalt-web/db` itself and `@cobalt-web/auth` for
Better Auth's adapter). All SQL lives here. Routes, workflows, cron jobs, and
agents call repo functions exported from this package — they never query the
DB directly.

A lint rule (`no-restricted-imports` in `oxlint.config.ts`) enforces this.

## Layout

```
packages/server-data/src/
  <domain>/
    queries.ts     # reads
    mutations.ts   # writes
    schemas.ts     # zod boundary schemas
    lib.ts         # pure helpers (no db)
    actions.ts     # orchestration over queries + mutations + external calls
```

Domains map to bounded contexts (transactions, accounts, chat, snapshots,
providers/plaid, …). Nested sub-domains follow the same shape
(`transactions/tags/`, `import/account-mapping/`).

## Function naming

Drop scope suffixes that are redundant with the tenant-scope arg.

- `getChat(userId, chatId)` not `getChatForUser`
- `getTransactions(userId, filters)` not `getUserTransactions`
- `listAccounts(userId)` not `listAccountsByUserId`

Every read in this layer is tenant-scoped by convention — `userId` is the
first arg. Encoding that in the name is noise.

Exception: keep a suffix when there are genuinely two variants (e.g.
`getChat` vs `getChatAdmin` for an admin-bypass path).

## Tenant scope

Repo functions enforce ownership in the `where` clause, not in the route.
Routes never receive a `userId` filter that the repo silently trusts — the
repo always re-applies the filter against the caller's session userId.

A neutral 404 is the right failure for "missing OR not owned" — never
differentiate the two, or you leak existence of other users' rows.

```ts
// good
export async function getChat(userId: string, chatId: string) {
  const chat = await db.query.chats.findFirst({
    where: { chatId: { eq: chatId }, userId: { eq: userId } },
  });
  if (!chat) throw new ApiError(404, "chat_not_found", "Chat not found");
  return chat;
}
```

## Error model

Throw `ApiError(status, code, message)` from `_shared/api-error`. The Hono
`createApp()` factory's `onError` translates it to `{code, error}` JSON with
the right HTTP status. Plain `Error` becomes a 500 — only use it inside
workflows where there's no HTTP boundary.

## Return shapes

Prefer tight shapes — return only the columns the caller uses. Two upsides:

1. Explicit contract: callers can't drift onto columns the repo didn't intend
   to expose (e.g. internal flags, billing tokens).
2. Wire-cost discipline: forces the repo author to think about what's
   actually needed before adding joins or expensive columns.

If the same call site needs more, widen the shape — don't return the full
Drizzle row "just in case."

## When to add a function

Two adapters = real seam. Don't extract a one-liner shared by a single
caller. Extract when:

- The same query shape appears in 2+ places, **or**
- The query is non-trivial (joins, filters, pagination), **or**
- The query enforces a tenant-scope or other security invariant that should
  not be re-implemented per caller.

## Imports

Sub-path imports only — never barrel.

```ts
// good
import { getChat } from "@cobalt-web/server-data/chat/queries";

// bad
import { getChat } from "@cobalt-web/server-data";
```

The package.json `exports` field is configured per-domain to match.
