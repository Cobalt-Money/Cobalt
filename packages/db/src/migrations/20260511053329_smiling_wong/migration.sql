ALTER INDEX "user_alerts_source_source_id_idx" RENAME TO "user_alerts_source_idx";--> statement-breakpoint
ALTER INDEX "user_alerts_active_dedup_idx" RENAME TO "user_alerts_dedup_idx";--> statement-breakpoint
DROP INDEX "user_alerts_dedup_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "user_alerts_dedup_idx" ON "user_alerts" ("source","source_id","type") WHERE resolved_at IS NULL;--> statement-breakpoint
CREATE INDEX "user_alerts_active_idx" ON "user_alerts" ("user_id","resolved_at");