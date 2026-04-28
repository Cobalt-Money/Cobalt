ALTER TABLE "recurring" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "recurring" ADD COLUMN "category_confidence" text;--> statement-breakpoint
ALTER TABLE "recurring" ADD COLUMN "category_detail" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "category_confidence" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "category_detail" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "lon" double precision;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "store_number" text;