-- Migration: varchar (generateId/CUID) -> uuid (gen_random_uuid)
-- Phase 4: financial_events, event_articles (event_articles references financial_events)

-- financial_events
ALTER TABLE "financial_events" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "financial_events" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "event_articles" DROP CONSTRAINT IF EXISTS "event_articles_financial_event_id_financial_events_id_fk";--> statement-breakpoint
ALTER TABLE "event_articles" ADD COLUMN "financial_event_id_new" uuid;--> statement-breakpoint
UPDATE "event_articles" ea SET "financial_event_id_new" = fe."id_new" FROM "financial_events" fe WHERE ea."financial_event_id" = fe."id";--> statement-breakpoint
ALTER TABLE "event_articles" DROP COLUMN "financial_event_id";--> statement-breakpoint
ALTER TABLE "event_articles" RENAME COLUMN "financial_event_id_new" TO "financial_event_id";--> statement-breakpoint
ALTER TABLE "financial_events" DROP CONSTRAINT "financial_events_pkey";--> statement-breakpoint
ALTER TABLE "financial_events" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "financial_events" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "financial_events" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "financial_events" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "event_articles" ADD CONSTRAINT "event_articles_financial_event_id_financial_events_id_fk" FOREIGN KEY ("financial_event_id") REFERENCES "financial_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "event_articles" ALTER COLUMN "financial_event_id" SET NOT NULL;--> statement-breakpoint

-- event_articles id
ALTER TABLE "event_articles" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "event_articles" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "event_articles" DROP CONSTRAINT "event_articles_pkey";--> statement-breakpoint
ALTER TABLE "event_articles" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "event_articles" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "event_articles" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "event_articles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
