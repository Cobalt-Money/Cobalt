# local-bootstrap.sql

Creates **NOLOGIN** group roles `pg_read_all_data` and `pg_write_all_data` and grants `USAGE ON SCHEMA public`. Migrations that define RLS policies targeting those roles **require** this to run first.

See [README](./README.md) for the full local sequence.
