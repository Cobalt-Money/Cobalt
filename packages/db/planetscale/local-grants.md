# local-grants.sql

Grants `SELECT` / `ALL` on **existing** `public` tables and sequences to the group roles, sets **default privileges** for future tables created as `postgres`, and creates login roles `agent_local` and `app_local` (dev passwords).

Run **after** `bun db:migrate` so tables exist.

See [README](./README.md) for connection strings.
