#!/usr/bin/env bash
# Dump local merchant + merchant_location for restore into prod.
# Usage:   bash packages/db/scripts/import/merchants/dump-merchant-tables.sh > /tmp/sri-352-merchants.sql
# Restore: psql "$PROD_URL" -f /tmp/sri-352-merchants.sql
set -euo pipefail
# Local DB is Postgres 18 in Docker. macOS-installed pg_dump may be older and
# refuses to dump a newer server, so we exec pg_dump *inside* the container.
CONTAINER="${PG_CONTAINER:-cobalt-local-db-postgres-1}"
# --data-only: skip CREATE TABLE (already exists in prod via migration).
# --column-inserts: portable INSERTs (slower but survives FK ordering).
# --disable-triggers: skip enforcing FK during restore (we order tables ourselves).
exec docker exec -i "$CONTAINER" pg_dump \
  -U postgres -d cobalt \
  --data-only \
  --no-owner \
  --no-acl \
  --column-inserts \
  --disable-triggers \
  --table=public.merchant \
  --table=public.merchant_location
