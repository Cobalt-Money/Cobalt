# Hosted Postgres providers

Zero works with many managed Postgres offerings. This chapter captures **integration rules** that come up repeatedly. Always double-check your provider’s current replication docs before production.

## Supabase

**Direct connection, not the pooler.**  
Zero opens a **logical replication** connection and uses a **replication slot**. Connection poolers (transaction pooling) break that model. Use Supabase’s **direct** connection string for the role that owns replication.

**Postgres version and event triggers.**  
Newer 15.x builds improve **event trigger** support. Older minors may still work but **schema migrations** can be slower or trigger heavier resets when triggers are missing.

**IPv6 vs IPv4.**  
If `zero-cache` runs in an environment **without IPv6** and your Supabase project is IPv6-only, you need a path to IPv4 (provider plans and networking vary). Symptom: replication never connects despite correct credentials.

## PlanetScale for Postgres (not MySQL)

**Critical:** “PlanetScale for Postgres” is **Postgres**. Zero does **not** replicate from **MySQL/Vitess**.

**Roles:** Use the **default** database role that can create **replication slots**. Custom roles often lack slot privileges.

**Connection types:** Use a **direct** connection for **upstream** replication. For auxiliary databases **`zero-cache` uses internally** (CVR / change DB in their model), use **pgbouncer-appropriate** strings so you do not exhaust connection limits—follow PlanetScale’s Zero-oriented guidance.

## Neon (and similar serverless Postgres)

**Always-on billing.**  
`zero-cache` holds a **long-lived replication connection**. While it runs, Postgres may stay “warm,” which interacts with **per-second** billing models. For tiny hobby projects this can be surprising.

**Branching previews.**  
Database **branches** for preview apps are powerful but easy to misuse: each preview might keep replication active. Read Zero’s **preview deployment** guidance before automating branch-per-PR without cleanup.

## Fly.io internal networking

When Postgres and `zero-cache` talk over Fly’s internal network **without TLS**, you may need **`sslmode=disable`** on the connection string from `zero-cache` to Postgres. Prefer TLS whenever the platform supports it end-to-end.

## Google Cloud SQL

Enable **logical decoding** via the instance flags Google documents; you often do **not** set `wal_level` manually the way you would on a VM.

## AWS RDS / Aurora

Generally supported; verify **logical replication** and **slot** limits for your instance class. Aurora has minimum engine versions called out in Zero’s provider doc.

## Event triggers recap

Providers that **disallow event triggers** still work but may **reset all cache state** on schema change. For **> ~10 GB** or strict uptime, favor hosts that allow triggers.

## Related chapters

- [postgres-support.md](postgres-support.md) — generic Postgres requirements
- [deployment.md](deployment.md) — where `zero-cache` runs
- [faq.md](faq.md) — connection failures

## Package reference

No separate “provider” package—requirements are **Postgres + replication**. For what `zero-cache` expects from upstream, see **`out/zero-cache/src/`** and [deployment.md](deployment.md).

## Further reading (official)

- [Connecting to Postgres](https://zero.rocicorp.dev/docs/connecting-to-postgres) (provider table and subsections)
