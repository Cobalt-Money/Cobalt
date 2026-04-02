-- PlanetScale-style roles (must exist before migrations create RLS policies)
-- Run before `bun db:migrate`
-- Usage: see root `package.json` → `bun db:local:init`

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_read_all_data') THEN
    CREATE ROLE pg_read_all_data NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pg_write_all_data') THEN
    CREATE ROLE pg_write_all_data NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO pg_read_all_data, pg_write_all_data;
