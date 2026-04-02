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
  -- Legacy roles referenced by old migrations (pre-refactor)
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE "authenticated" NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service-webhook') THEN
    CREATE ROLE "service-webhook" NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE "supabase_auth_admin" NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_readonly') THEN
    CREATE ROLE "agent_readonly" NOLOGIN;
  END IF;
  -- auth.uid() stub for old Supabase-style RLS policies
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS text AS $f$
    SELECT current_setting('request.jwt.claim.sub', true);
  $f$ LANGUAGE sql STABLE;
END
$$;

GRANT USAGE ON SCHEMA public TO pg_read_all_data, pg_write_all_data;
