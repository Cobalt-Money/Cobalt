# SRI-188: OAuth/JWKS Tables Migration

**Date:** 2026-04-02
**Ticket:** [SRI-188](https://linear.app/sriket/issue/SRI-188)

## Problem

`drizzle-kit generate` silently ignored 5 OAuth/JWKS tables (`oauth_client`, `oauth_refresh_token`, `oauth_access_token`, `oauth_consent`, `jwks`) defined in `packages/db/src/schema/auth/auth.ts`. Despite being properly exported, they never appeared in migration output.

### Root cause

During the interactive `drizzle-kit generate` that produced the `amused_nightcrawler` bridging migration (which handled 23 table renames, 6 new tables, column renames, etc.), the 5 OAuth/JWKS tables were likely presented as create/rename prompts and skipped. The resulting v8 DDL snapshot recorded 40 tables but omitted these 5 entirely. Since drizzle-kit diffs the schema against the latest snapshot, it saw no diff and reported "no changes."

## Fix

### 1. Manual migration

Created `packages/db/src/migrations/20260402230946_oauth_jwks_tables/` with:

- **`migration.sql`** — CREATE TABLE + ENABLE RLS + indexes + foreign keys + RLS policies for all 5 tables
- **`snapshot.json`** — Extended the previous snapshot's DDL array with all table metadata (columns, PKs, unique constraints, indexes, FKs, policies)

### 2. Snapshot format gotchas (drizzle-kit v8 DDL format)

When manually writing snapshot entries, the following format rules apply:

| Entity type        | Key             | Correct                                  | Wrong                                    |
| ------------------ | --------------- | ---------------------------------------- | ---------------------------------------- |
| columns (varchar)  | extra fields    | No `length` key                          | `length: 255`                            |
| indexes            | column format   | `value`, `nullsFirst` (bool)             | `expression`, `nulls` (string)           |
| indexes            | `with`          | `""` (empty string)                      | `null`                                   |
| indexes            | `nameExplicit`  | `true`                                   | `false`                                  |
| foreign keys       | table reference | `table`                                  | `tableFrom`                              |
| foreign keys       | action casing   | `"CASCADE"`, `"NO ACTION"`, `"SET NULL"` | `"cascade"`, `"no action"`, `"set null"` |
| unique constraints | entityType      | `"uniques"`                              | `"uniqueConstraints"`                    |

drizzle-kit will reject the snapshot with `data is malformed` if any of these are wrong, without saying which field is the problem. It logs the offending entry to stdout right before the error.

### 3. Production migration hash mismatch

When running `bun run db:migrate` against prod, drizzle-kit errored with:

> "9 migrations (ids: 68-76) in the database that do not match any local migration"

This happened because the legacy flat-format migrations were converted to v3 folder format during the `amused_nightcrawler` work. The conversion changed the file hashes, but prod's `drizzle.__drizzle_migrations` table still had the old hashes.

**Fix:** Updated the 9 prod rows to use the new local hashes via PlanetScale MCP.

### 4. RFC 8414 well-known route

Cursor MCP client returned 404 when connecting. The OAuth discovery flow requires a path-suffixed authorization server metadata endpoint per RFC 8414:

```
/.well-known/oauth-authorization-server/api/auth
```

Added this route in `apps/server/src/index.ts`. The Better Auth docs confirm this must be manually created.

## Rollback

### Revert migration hashes (if drizzle-kit breaks)

The old prod hashes are saved in `packages/db/src/migrations/prod-hash-rollback.sql`.

### Drop the 5 tables (if needed)

```sql
DROP TABLE IF EXISTS "oauth_consent" CASCADE;
DROP TABLE IF EXISTS "oauth_access_token" CASCADE;
DROP TABLE IF EXISTS "oauth_refresh_token" CASCADE;
DROP TABLE IF EXISTS "oauth_client" CASCADE;
DROP TABLE IF EXISTS "jwks" CASCADE;

-- Also remove the migration tracking row
DELETE FROM drizzle.__drizzle_migrations WHERE hash = 'db7903f1631442c5debe8069c343bf6cd065c9442aa4cf1b8188be0a6663ca22';
```

Note: Drop order matters due to foreign key dependencies (consent/access/refresh reference client).

## Files changed

- `packages/db/src/migrations/20260402230946_oauth_jwks_tables/migration.sql` — new
- `packages/db/src/migrations/20260402230946_oauth_jwks_tables/snapshot.json` — new
- `packages/db/src/migrations/prod-hash-rollback.sql` — rollback reference
- `apps/server/src/index.ts` — added RFC 8414 path-suffixed well-known route

## Debugging tips

- `bun run db:migrate` swallows errors silently. Always use `bun run db:migrate:debug` to see the actual Postgres error.
- PlanetScale Postgres with the `pg` driver: use `sslmode=require` in connection strings (not `verify-full`, which hangs).
- If `drizzle-kit generate` reports "no changes" but tables are missing from the snapshot, inspect the latest `snapshot.json` DDL array — search for `entityType: "tables"` entries and compare against your schema exports.
