-- SRI-307: catchup migration to bring prod schema in line with schema.ts.
-- Generated from `drizzle-kit push` diff (schema.ts vs prod). All statements
-- guarded so re-applying is a no-op on environments already aligned (e.g. local).

CREATE INDEX IF NOT EXISTS "event_articles_financial_event_id_idx" ON "event_articles" ("financial_event_id");
CREATE INDEX IF NOT EXISTS "financial_events_date_id_idx" ON "financial_events" ("date","id");
CREATE INDEX IF NOT EXISTS "financial_events_created_at_id_idx" ON "financial_events" ("created_at","id");
CREATE INDEX IF NOT EXISTS "financial_events_tickers_idx" ON "financial_events" USING gin ("tickers");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

DO $$ BEGIN
  ALTER TABLE "parts" ADD CONSTRAINT "text_text_required_if_type_is_text"
    CHECK (CASE WHEN "type" = 'text' THEN "text_text" IS NOT NULL ELSE TRUE END);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parts" ADD CONSTRAINT "reasoning_text_required_if_type_is_reasoning"
    CHECK (CASE WHEN "type" = 'reasoning' THEN "reasoning_text" IS NOT NULL ELSE TRUE END);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
