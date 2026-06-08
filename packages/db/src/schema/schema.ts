// This file re-exports every Drizzle table in the repo so drizzle-kit sees the
// FULL database schema and never generates spurious DROP statements for tables
// it doesn't know about.
//
// This is separate from ./zero-schema.ts on purpose:
//   - ./zero-schema.ts  → drizzle-zero's input; intentionally omits tables
//     that should not be part of Zero replication (server-only tables).
//   - ./schema.ts → drizzle-kit's input; includes EVERY table.
//
// When adding a new table:
//   - Always export it from here so migrations pick it up.
//   - Also export it from ./zero-schema.ts if and only if the table should
//     sync to Zero clients.

export * from "./zero-schema"; // oxlint-disable-line no-barrel-file

// Server-only auth tables — omitted from zero-schema.ts to keep them out of
// Zero replication, but the DB has them and drizzle-kit needs to know.
export {
  apikey,
  jwks,
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
} from "./users/auth/auth";

// Server-only research tables — populated by background jobs, read by the
// server, never synced to Zero clients.
export { fundamentals } from "./research/fundamentals";
export { tickers } from "./research/tickers";

// SRI-264 enums — defined alongside their primary table.
export { accountSource } from "./accounts/account";
export { transactionSource } from "./accounts/banking/transactions/transaction";
export { activitySource } from "./accounts/investments/investment-activity";
export { securitySource } from "./accounts/investments/security";

// Enum used by the feedback table (the table itself is re-exported through
// zero-schema.ts; the enum is re-exported here so drizzle-kit creates the
// type before tables reference it).
export { feedbackTypeEnum } from "./users/feedback";

// SRI-181 — server-only, not replicated to Zero clients.
export {
  transactionEdit,
  transactionEditActor,
} from "./accounts/banking/transactions/transaction-edit";

// SRI-317 — import pipeline tables. Server-only: staged rows are transient
// (wiped post-commit) and the UI polls job status via REST rather than Zero.
export { importJob, importJobStatus, importSource } from "./imports/import-job";
export { importStagedTransaction } from "./imports/import-staged-transaction";

// SRI-321 — AI-mapped CSV import caches. Server-only.
export { csvMappingCache } from "./imports/csv-mapping-cache";
export { csvColumnRoleCache } from "./imports/csv-column-role-cache";
export { accountMappingCache } from "./imports/account-mapping-cache";
export { categoryMappingCache } from "./imports/category-mapping-cache";

// SRI-349 — social layer (friends.cobaltpf.com). Mix of Zero-synced + server-only.
//   - socialFriendship, socialPost, socialShareSettings → Zero
//   - socialInvite, socialInviteDecline, socialInviteRedemption, merchantGeocodeCache → server-only
export {
  socialFriendship,
  socialInvite,
  socialInviteDecline,
  socialInviteRedemption,
  socialPost,
  socialShareSettings,
  socialMerchantBlocklist,
  socialCategoryBlocklist,
  merchantGeocodeCache,
} from "./social";

// SRI-354 — canonical POI directory. Single denormalized table replacing
// SRI-352 merchant + merchant_location. Server-only.
export { place } from "./places/place";

// SRI-354 — enrichment audit log. Server-only: written by enrichment pipeline,
// used for bulk rollback + per-txn forensics; never exposed to clients.
export { enrichmentEvent } from "./places/enrichment-event";

// SRI-354 — locality → ZIP lookup (GeoNames-backed). Server-only reference
// table used by enrichment to recover missing `postal_code` from `(city, region)`.
export { localityZip } from "./places/locality-zip";
