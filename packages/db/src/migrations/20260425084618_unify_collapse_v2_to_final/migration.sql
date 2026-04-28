-- SRI-264 Layer 3 prep: collapse `_v2` suffixes onto final names.
--
-- Rationale: 6 new tables shipped with `_v2` SQL suffixes to avoid colliding
-- with the legacy banking/brokerage tables during the dual-build window. Now
-- that all server-side reads + writes target the new tables, the old tables
-- are zero-traffic. Park them in an `archive` schema (metadata-only operation,
-- preserves data for rollback / inspection) and rename the new ones to their
-- canonical names. A subsequent migration can DROP SCHEMA archive CASCADE
-- once we're confident.
--
-- Order matters: park old → rename new. Otherwise the rename collides.

CREATE SCHEMA IF NOT EXISTS archive;

-- ── 1. Park old tables (data preserved under `archive.*`) ────────────

-- Plaid-side tables superseded by `transaction_v2`, `recurring_stream_v2`, etc.
ALTER TABLE "transaction" SET SCHEMA archive;
ALTER TABLE "recurring_stream" SET SCHEMA archive;
ALTER TABLE "investment_activity" SET SCHEMA archive;
ALTER TABLE "credit_liability" SET SCHEMA archive;
ALTER TABLE "mortgage_liability" SET SCHEMA archive;
ALTER TABLE "student_loan_liability" SET SCHEMA archive;

-- Plaid-side tables superseded by `financial_account`, `balance`, `snapshot`,
-- `holding`, `security`. No name collisions, but they're equally dead.
ALTER TABLE "bank_account" SET SCHEMA archive;
ALTER TABLE "bank_balance" SET SCHEMA archive;
ALTER TABLE "bank_balance_snapshot" SET SCHEMA archive;
ALTER TABLE "bank_connection" SET SCHEMA archive;
ALTER TABLE "investment_position" SET SCHEMA archive;
ALTER TABLE "investment_security" SET SCHEMA archive;

-- SnapTrade-side tables superseded by `financial_account`, `balance`,
-- `snapshot`, `holding`, `investment_activity_v2`, `orders`,
-- `snaptrade_authorization`, `snaptrade_user`.
ALTER TABLE "brokerage_account" SET SCHEMA archive;
ALTER TABLE "brokerage_account_detail" SET SCHEMA archive;
ALTER TABLE "brokerage_authorization" SET SCHEMA archive;
ALTER TABLE "brokerage_balance" SET SCHEMA archive;
ALTER TABLE "brokerage_position" SET SCHEMA archive;
ALTER TABLE "brokerage_order" SET SCHEMA archive;
ALTER TABLE "brokerage_activity" SET SCHEMA archive;
ALTER TABLE "brokerage_user" SET SCHEMA archive;
ALTER TABLE "portfolio_snapshot" SET SCHEMA archive;

-- ── 2. Promote `_v2` tables to their final names ────────────────────

ALTER TABLE "transaction_v2" RENAME TO "transaction";
ALTER TABLE "recurring_stream_v2" RENAME TO "recurring_stream";
ALTER TABLE "investment_activity_v2" RENAME TO "investment_activity";
ALTER TABLE "credit_liability_v2" RENAME TO "credit_liability";
ALTER TABLE "mortgage_liability_v2" RENAME TO "mortgage_liability";
ALTER TABLE "student_loan_liability_v2" RENAME TO "student_loan_liability";

-- ── 3. Strip `_v2` from index names (cosmetic) ──────────────────────

-- transaction
ALTER INDEX "transaction_v2_account_id_idx" RENAME TO "transaction_account_id_idx";
ALTER INDEX "transaction_v2_user_id_idx" RENAME TO "transaction_user_id_idx";
ALTER INDEX "transaction_v2_date_idx" RENAME TO "transaction_date_idx";
ALTER INDEX "transaction_v2_account_date_idx" RENAME TO "transaction_account_date_idx";
ALTER INDEX "transaction_v2_pending_idx" RENAME TO "transaction_pending_idx";
ALTER INDEX "transaction_v2_date_pending_idx" RENAME TO "transaction_date_pending_idx";
ALTER INDEX "transaction_v2_source_external_id_idx" RENAME TO "transaction_source_external_id_idx";

-- recurring_stream
ALTER INDEX "recurring_stream_v2_account_id_idx" RENAME TO "recurring_stream_account_id_idx";
ALTER INDEX "recurring_stream_v2_user_id_idx" RENAME TO "recurring_stream_user_id_idx";
ALTER INDEX "recurring_stream_v2_account_date_type_idx" RENAME TO "recurring_stream_account_date_type_idx";
ALTER INDEX "recurring_stream_v2_source_external_id_idx" RENAME TO "recurring_stream_source_external_id_idx";

-- investment_activity
ALTER INDEX "investment_activity_v2_account_idx" RENAME TO "investment_activity_account_idx";
ALTER INDEX "investment_activity_v2_user_idx" RENAME TO "investment_activity_user_idx";
ALTER INDEX "investment_activity_v2_date_idx" RENAME TO "investment_activity_date_idx";
ALTER INDEX "investment_activity_v2_account_date_idx" RENAME TO "investment_activity_account_date_idx";
ALTER INDEX "investment_activity_v2_security_idx" RENAME TO "investment_activity_security_idx";
ALTER INDEX "investment_activity_v2_type_idx" RENAME TO "investment_activity_type_idx";
ALTER INDEX "investment_activity_v2_source_external_id_idx" RENAME TO "investment_activity_source_external_id_idx";

-- liabilities
ALTER INDEX "credit_liability_v2_user_id_idx" RENAME TO "credit_liability_user_id_idx";
ALTER INDEX "mortgage_liability_v2_user_id_idx" RENAME TO "mortgage_liability_user_id_idx";
ALTER INDEX "student_loan_liability_v2_user_id_idx" RENAME TO "student_loan_liability_user_id_idx";
