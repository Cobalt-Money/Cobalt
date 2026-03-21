# Schema

The **schema** is the contract between **Postgres**, **`zero-cache`**, and every **Zero client**. It describes tables, columns, primary keys, and relationships so ZQL and mutators are type-safe and predictable.

## Why the schema matters

- The **client** uses the schema to know which tables exist and how to **join** and **filter** in ZQL.
- **`zero-cache`** uses the same logical shape when it materializes rows into **SQLite**.
- **Publications** (what gets replicated from Postgres) must align with what the schema expects. If replication omits a column the client schema includes, you get version or runtime errors.

Think of the schema as **the map** everyone shares. Postgres is the territory; the map must stay current.

## Tables, columns, and relationships

A typical schema declaration includes:

- **Tables** with column names and types compatible with Postgres types you replicate.
- **Primary keys** (or equivalent uniqueness) so rows are addressable in the local store and in ZQL.
- **Relationships** (foreign keys / edges) so ZQL can traverse parent → child without ad-hoc SQL strings in the UI.

Exact declaration APIs are defined by the Zero TypeScript packages; this skill focuses on **concepts**. In practice you either hand-write the Zero schema or **generate** it from another source (for example Drizzle in this monorepo).

## Publications and replication scope

Postgres **logical replication** publishes **change events** for rows in published tables. Not every column or table must be published, but **everything the client schema exposes as readable** must be **reachable** through replication and query resolution.

If your database user cannot create a default publication (some hosts restrict privileges), you may need a **manually created publication** and to configure **`zero-cache`** with the right publication name—see [deployment.md](deployment.md) for configuration concepts and your host’s Postgres docs for SQL.

## Migrations

Schema changes flow **upstream first**:

1. Run a **Postgres migration** (add column, new table, index, and so on).
2. Update the **Zero schema** to match.
3. Restart or roll **`zero-cache`** as required so replication and SQLite stay coherent.

**Event triggers:** On hosts that support Postgres **event triggers**, Zero can integrate schema migrations more smoothly. On hosts that **forbid** event triggers, Zero can still work, but a migration may force a **full reset** of server-side cache state and clients—acceptable for small databases, painful for large ones. Details: [postgres-support.md](postgres-support.md) and [providers.md](providers.md).

## Generated schema in monorepos

When Zero schema is **generated** from ORM definitions:

- Regenerate after **every** upstream schema change.
- Commit generated output or ensure CI fails if it drifts.
- If you see errors about **unsupported schema version** or missing columns in replication, suspect **stale codegen** or a publication that does not include new columns.

This repository: see [`packages/zero/AGENTS.md`](../../../packages/zero/AGENTS.md) for the generate command and file layout.

## Next chapters

- [reading.md](reading.md) — queries over this schema (see **reading/** folder)
- [writing.md](writing.md) — mutators that change rows (see **writing/** folder)
- [zql.md](zql.md) — how ZQL navigates relationships (see **zql/** folder, especially [zql/relationships.md](zql/relationships.md))

## Package reference

**`out/zero-schema/src/builder/`** — schema builder, table and relationship definitions. Permissions / policies: **`out/zero-schema/src/permissions.ts`** (and nearby exports).

## Further reading (official)

- [Schema](https://zero.rocicorp.dev/docs/schema)
- [Postgres feature compatibility](https://zero.rocicorp.dev/docs/postgres-support)
