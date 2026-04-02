-- Migration: varchar (generateId/CUID) -> uuid (gen_random_uuid)
-- CUIDs are not valid UUIDs, so we use add/backfill/switch/drop pattern per table.

-- plaid_institutions
ALTER TABLE "plaid_institutions" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "plaid_institutions" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "plaid_institutions" DROP CONSTRAINT "plaid_institutions_pkey";--> statement-breakpoint
ALTER TABLE "plaid_institutions" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "plaid_institutions" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "plaid_institutions" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "plaid_institutions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- plaid_items
ALTER TABLE "plaid_items" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "plaid_items" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "plaid_items" DROP CONSTRAINT "plaid_items_pkey";--> statement-breakpoint
ALTER TABLE "plaid_items" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "plaid_items" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "plaid_items" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "plaid_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- feedback
ALTER TABLE "feedback" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "feedback" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_pkey";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "feedback" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "feedback" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- financial_goals
ALTER TABLE "financial_goals" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "financial_goals" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_pkey";--> statement-breakpoint
ALTER TABLE "financial_goals" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "financial_goals" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "financial_goals" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "financial_goals" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- rss_feeds (must run before rss_articles - feed_ids references rss_feeds.id)
ALTER TABLE "rss_feeds" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "rss_feeds" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
-- Update rss_articles.feed_ids: replace old varchar ids with new uuids
CREATE TEMP TABLE rss_feeds_id_mapping AS SELECT "id" as old_id, "id_new" FROM "rss_feeds";--> statement-breakpoint
UPDATE "rss_articles" a SET feed_ids = (
  SELECT COALESCE(
    jsonb_agg(
      COALESCE(m.id_new::text, elem)
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements_text(a.feed_ids) AS elem
  LEFT JOIN rss_feeds_id_mapping m ON m.old_id = elem
);--> statement-breakpoint
ALTER TABLE "rss_feeds" DROP CONSTRAINT "rss_feeds_pkey";--> statement-breakpoint
ALTER TABLE "rss_feeds" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "rss_feeds" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "rss_feeds" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "rss_feeds" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- rss_articles
ALTER TABLE "rss_articles" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "rss_articles" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "rss_articles" DROP CONSTRAINT "rss_articles_pkey";--> statement-breakpoint
ALTER TABLE "rss_articles" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "rss_articles" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "rss_articles" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "rss_articles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
