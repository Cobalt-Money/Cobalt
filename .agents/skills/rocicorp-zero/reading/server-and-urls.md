# Server setup and query URLs

For queries to sync, **`zero-cache`** must reach an HTTP **`query` endpoint** on your backend. That endpoint resolves **query name + args (+ auth-derived context)** to **ZQL** (or an AST) that `zero-cache` executes on its replica.

## `ZERO_QUERY_URL`

Configure `zero-cache` with the base URL of your implementation — commonly an env var such as:

```bash
export ZERO_QUERY_URL="http://localhost:3000/api/zero/query"
```

Exact variable names and deployment patterns are covered in [deployment.md](../deployment.md) and the official **zero-cache configuration** page.

## Implementing the endpoint

Zero’s TypeScript libraries provide helpers such as **`handleQueryRequest`** (accepts a standard `Request`, returns JSON you send as the response) and **`mustGetQuery`** (looks up a query in the registry by name). Your framework (Hono, Next, etc.) wraps these in a route handler.

At a high level the handler:

1. Authenticates the caller (session, JWT, …).
2. Builds **`ctx`** for query functions (user id, tenant, …).
3. Dispatches to the registered query’s **validated** implementation.
4. Returns the **AST / ZQL** representation `zero-cache` expects.

Parse or application errors can be returned in structured error shapes documented on the Queries page; **transport** failures (HTTP down, TLS, timeouts) are a separate concern handled via **connection status** — see [partial-results.md](partial-results.md) and [connection.md](../connection.md).

## Per-client `queryURL`

Default behavior: every client uses the URL configured in `zero-cache`. You can instead list **multiple comma-separated URLs** in `ZERO_QUERY_URL` and pass **`queryURL`** into the **`Zero` constructor** on specific clients (for example staging vs production, or branch previews).

## `URLPattern` allowlists

Each entry in `ZERO_QUERY_URL` can be a literal URL or a **`URLPattern`** string. That restricts which preview hostnames clients may select — for example `https://mybranch-*.preview.myapp.com/query` matches branch subdomains but rejects arbitrary domains or path suffixes.

**Pro tip:** `URLPattern` is a web standard — you can experiment in the browser DevTools.

Branch preview setups (Vercel, etc.) usually need coordinated **query + mutate** URL patterns; see the official **Preview deployments** guide linked below.

## Non-TypeScript servers

The wire format is documented: a **POST** with a JSON body listing query **`id`**, **`name`**, and **`args`**, and a parallel response array of successes (with **`ast`**) or structured errors. You can implement the endpoint in another language if you reproduce that contract — most teams still share the **registry** from TypeScript for one source of truth.

## Package reference

**`out/zero-server/src/`** — query request handling and AST authorization path (search **`*.d.ts`** for query / `handleQuery` style exports). Wire types often trace through **`out/zero-protocol/`**.

## Further reading (official)

- [Server setup](https://zero.rocicorp.dev/docs/queries#server-setup)
- [`ZERO_QUERY_URL`](https://zero.rocicorp.dev/docs/zero-cache-config#query-url)
- [Preview deployments](https://zero.rocicorp.dev/docs/preview-deployments)
- [Custom server implementation](https://zero.rocicorp.dev/docs/queries#custom-server-implementation)
