import { sql } from "drizzle-orm";
import { pgPolicy, pgRole } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/** PlanetScale / Postgres group roles — created by `bun db:local:init` before migrations. */
export const pgReadAllData = pgRole("pg_read_all_data").existing();
export const pgWriteAllData = pgRole("pg_write_all_data").existing();

/** App connection (`pg_write_all_data`): full CRUD. */
export const appFullAccess = () =>
  pgPolicy("app_full_access", {
    as: "permissive",
    for: "all",
    to: pgWriteAllData,
    using: sql`true`,
    withCheck: sql`true`,
  });

/** Agent (`pg_read_all_data`): SELECT rows for JWT `sub`, or all rows when claims unset. */
export const agentSelectOwn = (userIdColumn: string) =>
  pgPolicy("agent_select_own", {
    as: "permissive",
    for: "select",
    to: pgReadAllData,
    using: sql.raw(
      `current_setting('request.jwt.claims', true) IS NULL OR "${userIdColumn}" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')`
    ),
  });

export const agentSelectViaBankAccount = (plaidAccountIdColumn: AnyPgColumn) =>
  pgPolicy("agent_select_own", {
    as: "permissive",
    for: "select",
    to: pgReadAllData,
    using: sql`current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = ${plaidAccountIdColumn}
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    )`,
  });

export const agentSelectViaBankConnection = (plaidItemIdColumn: AnyPgColumn) =>
  pgPolicy("agent_select_own", {
    as: "permissive",
    for: "select",
    to: pgReadAllData,
    using: sql`current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_connection
      WHERE bank_connection.plaid_item_id = ${plaidItemIdColumn}
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    )`,
  });

/** Reference / public data readable by agent when claims unset or for lookup. */
export const agentSelectPublic = () =>
  pgPolicy("agent_select_public", {
    as: "permissive",
    for: "select",
    to: pgReadAllData,
    using: sql`true`,
  });
