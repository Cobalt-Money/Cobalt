# Deployment and `zero-cache`

Running Zero in production means orchestrating **three cooperating processes** (often more with load balancers):

1. **Postgres** (upstream)
2. **`zero-cache`** (replica + sync hub)
3. **Your API server** (query + mutate endpoints)
4. **Static/SSR web host** for the client bundle (your existing frontend pipeline)

## Process roles

### Postgres

Holds authoritative data. Must expose **logical replication** to `zero-cache`. See [postgres-support.md](postgres-support.md).

### `zero-cache`

- Consumes the replication stream into **SQLite on disk** (path configured via zero-cache options).
- Accepts **client sync connections**.
- For each active subscription, calls your API’s **query URL** to obtain **authorized ZQL**.
- For each mutation, calls your API’s **mutate URL** to write **Postgres**.

### API server

Implements:

- **Query resolver** — auth + return ZQL.
- **Mutate handler** — auth + apply transactional writes.

These are ordinary HTTP handlers in your framework (Hono, Express, and so on); Zero defines the **contract**, not the framework.

## Environment variables (conceptual)

Exact names and defaults live in **`zero-cache` configuration** documentation. Conceptually you always wire:

- **Upstream Postgres URL** — replication-capable user.
- **`ZERO_QUERY_URL`** — where `zero-cache` posts query resolution requests.
- **`ZERO_MUTATE_URL`** — where `zero-cache` posts mutations.

Your API must be reachable from **`zero-cache`’s network** (VPC, private link, or public HTTPS with auth).

## Publications

`zero-cache` only replicates tables in the configured **publication**. If your migration user cannot auto-create publications, create them in SQL and reference them in `zero-cache` **app publication** settings.

Misconfigured publications cause classic symptoms: **empty clients** despite rows in Postgres.

## Previews and branch databases

Preview environments often get **one database branch per PR**. That multiplies:

- Replication slots
- `zero-cache` instances
- Running Postgres compute

Plan **cleanup** when PRs close. Zero documents **preview URL** strategies that avoid leaving many branches hot indefinitely.

## Health checks

Monitor:

- **`zero-cache` process** alive and disk writable.
- **Replication lag** (provider metrics + Zero replication debug tools).
- **Query/mutate error rates** on your API (401/403/500).

## Related chapters

- [reading/server-and-urls.md](reading/server-and-urls.md) / [writing/server-push.md](writing/server-push.md) — query and mutate HTTP endpoints
- [connection.md](connection.md) — client ↔ `zero-cache` lifecycle
- [debugging.md](debugging.md) — when deploys misbehave

## Package reference

**`out/zero-cache/src/`** — `zero-cache` process (config, workers, storage). Your app’s env and process layout are outside the package; this subtree is the shipped cache implementation.

## Further reading (official)

- [Hosting](https://zero.rocicorp.dev/docs/deployment)
- [zero-cache configuration](https://zero.rocicorp.dev/docs/zero-cache-config)
- [Previews](https://zero.rocicorp.dev/docs/previews)
- [Preview deployments](https://zero.rocicorp.dev/docs/preview-deployments)
