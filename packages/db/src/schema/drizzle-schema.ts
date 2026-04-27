// Entry point for drizzle-kit migration generation.
//
// This file re-exports every Drizzle table in the repo so drizzle-kit sees the
// FULL database schema and never generates spurious DROP statements for tables
// it doesn't know about.
//
// This is separate from ./zero-schema.ts on purpose:
//   - ./zero-schema.ts  → drizzle-zero's input; intentionally omits tables
//     that should not be part of Zero replication (server-only tables).
//   - ./drizzle-schema.ts → drizzle-kit's input; includes EVERY table.
//
// When adding a new table:
//   - Always export it from here so migrations pick it up.
//   - Also export it from ./zero-schema.ts if and only if the table should
//     sync to Zero clients.

export * from "./zero-schema"; // oxlint-disable-line no-barrel-file

// Server-only auth tables — omitted from zero-schema.ts to keep them out of
// Zero replication, but the DB has them and drizzle-kit needs to know.
export {
  jwks,
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
} from "./auth/auth";

// Server-only research tables — populated by background jobs, read by the
// server, never synced to Zero clients.
export { fundamentals } from "./research/fundamentals";
export { tickers } from "./research/tickers";

// SRI-264 enums — defined alongside their primary table.
export { accountSource } from "./banking/financial-account";
export { transactionSource } from "./banking/transactions/transaction";
export { activitySource } from "./banking/investments/investment-activity";
export { securitySource } from "./banking/investments/security";
