-- Data migration: backfill flat columns from jsonb sources before the jsonb columns are dropped in the next migration.
-- transaction.personal_finance_category (jsonb) -> category, category_detail, category_confidence
-- recurring.personal_finance_category   (jsonb) -> category, category_detail, category_confidence
-- transaction.location                  (jsonb) -> address, city, region, postal_code, country, lat, lon, store_number

UPDATE "transaction" SET
  "category"            = "personal_finance_category"->>'primary',
  "category_detail"     = "personal_finance_category"->>'detailed',
  "category_confidence" = "personal_finance_category"->>'confidence_level'
WHERE "personal_finance_category" IS NOT NULL;
--> statement-breakpoint
UPDATE "recurring" SET
  "category"            = "personal_finance_category"->>'primary',
  "category_detail"     = "personal_finance_category"->>'detailed',
  "category_confidence" = "personal_finance_category"->>'confidence_level'
WHERE "personal_finance_category" IS NOT NULL;
--> statement-breakpoint
UPDATE "transaction" SET
  "address"      = "location"->>'address',
  "city"         = "location"->>'city',
  "region"       = "location"->>'region',
  "postal_code"  = "location"->>'postal_code',
  "country"      = "location"->>'country',
  "lat"          = NULLIF("location"->>'lat', '')::double precision,
  "lon"          = NULLIF("location"->>'lon', '')::double precision,
  "store_number" = "location"->>'store_number'
WHERE "location" IS NOT NULL;
