CREATE TABLE "locality_zip" (
	"city" text,
	"lat" double precision,
	"lon" double precision,
	"state" char(2),
	"zip5" text,
	CONSTRAINT "locality_zip_pkey" PRIMARY KEY("city","state","zip5")
);
--> statement-breakpoint
CREATE INDEX "locality_zip_lookup_idx" ON "locality_zip" ("state","city");
