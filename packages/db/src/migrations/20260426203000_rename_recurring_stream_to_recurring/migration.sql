-- Rename `recurring_stream` -> `recurring` (table + indexes).
-- Applies after SRI-264 unified-schema migrations have collapsed
-- recurring_stream_v2 into recurring_stream.

ALTER TABLE "recurring_stream" RENAME TO "recurring";--> statement-breakpoint

ALTER INDEX "recurring_stream_account_id_idx" RENAME TO "recurring_account_id_idx";--> statement-breakpoint
ALTER INDEX "recurring_stream_user_id_idx" RENAME TO "recurring_user_id_idx";--> statement-breakpoint
ALTER INDEX "recurring_stream_account_date_type_idx" RENAME TO "recurring_account_date_type_idx";--> statement-breakpoint
ALTER INDEX "recurring_stream_source_external_id_idx" RENAME TO "recurring_source_external_id_idx";
