# FAQ and common problems

Quick answers first, then a **symptom matrix**. Deep dives are in the linked chapters.

## FAQ

### My UI does not show rows that exist in Postgres

Work through:

1. **Is a query that loads those rows mounted or preloaded?** Inactive subscriptions do not hydrate the local store; **`preload()`** can warm data before navigation ([reading.md](reading.md), [reading/running-preloading.md](reading/running-preloading.md)).
2. **Is the server resolver filtering them out?** Log the returned ZQL during development ([authentication.md](authentication.md)).
3. **Is replication publishing that table/column?** Check publications and permissions ([deployment.md](deployment.md), [postgres-support.md](postgres-support.md)).

### My mutator reads empty related rows

Mutators read the **local store**. If no **active query** or **preload** fetched the parent row, it will not exist locally—even if Postgres has it ([reading/running-preloading.md](reading/running-preloading.md), [writing/defining-mutators.md](writing/defining-mutators.md)).

### Duplicate or conflicting IDs after inserts

You likely generate IDs **inside** the mutator differently on client vs server runs. Generate a **stable random id on the client** and pass it as an argument ([writing/running-results.md](writing/running-results.md)).

### Everything slowed down after a new query

Run **`analyze-query`** on that query. **`TEMP B-TREE`** in the plan usually means **bad ZQL shape** or **missing indexes**. Also check whether **preloads** cover the sorts you use — see [reading/consistency.md](reading/consistency.md) and [debugging.md](debugging.md).

### Auth works once, then sync stops

Token expiry or session rotation without **reconnecting** the sync client is a common cause. Wire **connection status** and explicit **reconnect** after login/logout/refresh ([connection.md](connection.md)).

### I changed the schema and clients show version errors

Regenerate Zero schema artifacts, redeploy client + server, restart **`zero-cache`**. In this repo run the command in [`packages/zero/AGENTS.md`](../../../packages/zero/AGENTS.md). Stale codegen causes **`SchemaVersionNotSupported`**-style failures when replication and client disagree.

### I recreated the dev database and Zero is inconsistent

Delete **`zero-cache`’s SQLite replica** for that env and **restart `zero-cache`** ([debugging.md](debugging.md)).

### Does PlanetScale MySQL work?

**No.** Zero requires **Postgres**. “PlanetScale for Postgres” is a different product than Vitess/MySQL ([providers.md](providers.md)).

## Symptom → cause → action

| Symptom                        | Likely cause                                                  | What to do                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Replication or slot errors     | Wrong `wal_level`, pooler connection, missing privileges      | [postgres-support.md](postgres-support.md), [providers.md](providers.md), then replication tools in [debugging.md](debugging.md) |
| Rows in DB, empty client       | Inactive query, missing preload, auth filter, publication gap | [reading/overview.md](reading/overview.md), [authentication.md](authentication.md), [deployment.md](deployment.md)               |
| High CPU in `zero-cache`       | Heavy ZQL, missing indexes                                    | [debugging.md](debugging.md) — analyze-query                                                                                     |
| Full reset after migration     | Host lacks event triggers                                     | [postgres-support.md](postgres-support.md), [providers.md](providers.md)                                                         |
| TypeScript global type clashes | `declare module` collisions with Zero augments                | Isolate entry types; follow Zero TS setup in official docs                                                                       |

## Pitfalls checklist

- Treat hook outputs as **immutable**.
- **Client-generate** primary keys for inserts when possible.
- **Await** every `tx.mutate.*` inside mutators ([writing/defining-mutators.md](writing/defining-mutators.md)).
- **Never** trust client args without server-side checks.
- **Reconnect** sync after auth changes.
- **Reset cache SQLite** when you reset dev Postgres.

## Still stuck?

Use the **Inspector** ([debugging.md](debugging.md)) and, if you believe you found a product bug, file with repro details via the official reporting channel.

## Package reference

Match the topic to a chapter in this skill—each includes a **Package reference** to **`@rocicorp/zero`** under **`out/`**. Quick map: queries **`out/zql/`** + **`out/zero-client/`**, mutators **`out/zql/src/mutate/`** + **`out/zero-server/`**, React **`out/zero-react/`**, schema **`out/zero-schema/`**, cache process **`out/zero-cache/`**.

## Further reading (official)

- [llms.txt](https://zero.rocicorp.dev/llms.txt) (topic index)
- [Reporting bugs](https://zero.rocicorp.dev/docs/reporting-bugs)
