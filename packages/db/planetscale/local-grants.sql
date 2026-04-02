-- Table permissions and login users (run after `bun db:migrate`)
-- Usage: see root `package.json` → `bun db:local:grants`

-- Table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pg_read_all_data;
GRANT ALL ON ALL TABLES IN SCHEMA public TO pg_write_all_data;

-- Sequences (for IDENTITY/SERIAL columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pg_write_all_data;

-- Future tables (migrations run as postgres)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO pg_read_all_data;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO pg_write_all_data;

-- Login users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_local') THEN
    CREATE ROLE agent_local WITH LOGIN PASSWORD 'agent_local_secret' IN ROLE pg_read_all_data;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_local') THEN
    CREATE ROLE app_local WITH LOGIN PASSWORD 'app_local_secret' IN ROLE pg_write_all_data;
  END IF;
END
$$;
