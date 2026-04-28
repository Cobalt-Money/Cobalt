ALTER TABLE "recurring_stream" RENAME TO "recurring";--> statement-breakpoint
ALTER INDEX "recurring_stream_account_id_idx" RENAME TO "recurring_account_id_idx";--> statement-breakpoint
ALTER INDEX "recurring_stream_user_id_idx" RENAME TO "recurring_user_id_idx";--> statement-breakpoint
ALTER INDEX "recurring_stream_account_date_type_idx" RENAME TO "recurring_account_date_type_idx";--> statement-breakpoint
ALTER INDEX "recurring_stream_source_external_id_idx" RENAME TO "recurring_source_external_id_idx";--> statement-breakpoint

-- Snapshot drift: `subscription.billing_interval` has existed in prod since
-- before this branch but was missing from an earlier hand-written
-- migration's snapshot. IF NOT EXISTS makes this a no-op on prod and
-- keeps fresh-build provisioning correct.
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "billing_interval" text;
