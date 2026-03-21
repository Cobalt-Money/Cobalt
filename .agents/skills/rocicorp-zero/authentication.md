# Authentication and authorization

Zero splits two problems:

1. **Authentication** — who is this client?
2. **Authorization** — which rows may they read or write?

Both must be enforced **on your server**. The local client is a UX layer, not a security boundary.

## Where auth runs

### Query resolution (`ZERO_QUERY_URL`)

When `zero-cache` resolves a named query, your handler receives:

- The **query name** and **arguments** from the client.
- Credentials your HTTP stack extracts (session, bearer token, and so on).

You build a **context** object (user id, org id, roles). From that context you return **ZQL that is already scoped**—for example filter messages by threads the user belongs to, or reject the query entirely if the args reference forbidden ids.

**Rule:** Never return “all rows” and rely on the client to hide some. The client can always lie.

### Mutate handler (`ZERO_MUTATE_URL`)

The same identity must gate **writes**. Optimistic UI means the client may **attempt** anything; Postgres should only commit **allowed** changes.

**Rule:** If a user cannot insert a row via mutate, they also should not see it via query.

## Passing identity from browser to server

Typical patterns:

- **Cookies** with SameSite and HTTPS in production (session id).
- **Bearer tokens** in `Authorization` (JWT or opaque token).
- **Mutual TLS** or internal network rules for server-to-server (less common for browser clients).

Zero does not mandate a specific OAuth or session library—it integrates with **whatever your API already uses**, as long as the query/mutate handlers can recover the same principal the UI thinks is signed in.

## Auth failures and the sync connection

Signing out, token expiry, or role change can leave the **sync connection** in a bad state. Zero documents a **connection status** API: in some cases you must **reconnect** explicitly after auth errors rather than expecting silent recovery.

See [connection.md](connection.md) for lifecycle and UI surfacing.

## Testing checklist

- **Cross-user isolation:** User A’s query args cannot fetch User B’s rows.
- **Tampered args:** Client sends another user’s id in args—server rejects or returns empty.
- **Mutate bypass:** HTTP replay of a mutate call without session fails.
- **Token rotation:** Refresh path reconnects sync without stale subscriptions.

## Related chapters

- [reading/server-and-urls.md](reading/server-and-urls.md) — query endpoint; [reading/defining-queries.md](reading/defining-queries.md) — `ctx` vs args
- [writing/defining-mutators.md](writing/defining-mutators.md) — `ctx` in mutators; [writing/permissions-async.md](writing/permissions-async.md) — server checks
- [connection.md](connection.md) — reconnect semantics

## Package reference

**`out/zero-client/src/client/context.ts`** — client auth context passed into queries/mutators. **`out/zero-schema/src/permissions.ts`** — policy helpers. Server-side query/mutate handlers: **`out/zero-server/src/`** (search for mutate/query request handling next to your version’s exports).

## Further reading (official)

- [Authentication](https://zero.rocicorp.dev/docs/auth)
- [Reading and syncing data](https://zero.rocicorp.dev/docs/queries)
- [Connection status](https://zero.rocicorp.dev/docs/connection)
