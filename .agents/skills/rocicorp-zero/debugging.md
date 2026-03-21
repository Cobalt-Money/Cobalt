# Debugging

When something breaks in Zero, split the problem into **which leg** failed: **Postgres replication**, **`zero-cache`**, **query/mutate HTTP**, or **client schema**.

## Ordered triage

1. **Postgres healthy?** Can you connect with `psql` using the same credentials `zero-cache` uses? Is **`wal_level`** logical (self-managed) or the provider equivalent enabled?
2. **Replication slot?** If slots are dropped or invalidated, `zero-cache` may **resync** or error loudly. Check provider metrics and Zero’s replication debugging guidance.
3. **`zero-cache` logs** — look for connection refused to your API, publication errors, or SQLite disk issues.
4. **API logs** — 401/403 means auth wiring; 500 means handler bugs; timeouts mean ZQL too heavy or DB locks.
5. **Client** — schema version errors mean **codegen drift** or mismatched deploys.

## Inspector

Zero ships an **Inspector** tool for inspecting **queries**, **local vs server** state, and subscription health. Use it when the UI disagrees with Postgres and you are unsure whether the bug is **client**, **cache**, or **resolver**.

## Slow queries and `analyze-query`

When sync feels slow:

1. Identify the **named query** responsible.
2. Run **`analyze-query`** (CLI from Zero tooling) and read the plan.
3. **`TEMP B-TREE`** and large sorts usually mean **missing indexes** or **ZQL** that cannot use indexes.

Fix **Postgres** first when filters map cleanly to btree or GIN indexes.

## Replication debugging

Use the dedicated **Replication** debugging chapter on the official site when you see slot errors, wal sender issues, or partial publications. Symptom: **some tables update, others never do**—almost always **publication** or **permissions**.

## Local dev: nuked database

If you dropped the dev database:

1. Recreate schema via migrations.
2. **Delete `zero-cache`’s SQLite files** for that environment (path from your config).
3. **Restart `zero-cache`** so it rebuilds from scratch.

Skipping step 2–3 produces ghosts: clients see old row ids or empty tables inconsistently.

## Observability

For production, consider **OpenTelemetry** integration documented by Zero to trace query resolution latency and mutation failures end-to-end.

## Related chapters

- [faq.md](faq.md) — quick symptom map
- [postgres-support.md](postgres-support.md) — upstream requirements
- [deployment.md](deployment.md) — miswired URLs

## Package reference

**`out/zero-client/src/`** — Inspector / dev-oriented exports (search for inspector-related modules). Query analysis / debug helpers may also appear under **`out/zql/`** or **`out/zero-server/`** depending on version—follow imports from the client entry you use.

## Further reading (official)

- [Inspector](https://zero.rocicorp.dev/docs/debug/inspector)
- [Slow queries](https://zero.rocicorp.dev/docs/debug/slow-queries)
- [Replication](https://zero.rocicorp.dev/docs/debug/replication)
- [Query ASTs](https://zero.rocicorp.dev/docs/debug/query-asts)
- [OpenTelemetry](https://zero.rocicorp.dev/docs/debug/otel)
- [zero-out](https://zero.rocicorp.dev/docs/debug/zero-out)
