DO $$ BEGIN
  ALTER TABLE "subscription" DROP CONSTRAINT "subscription_reference_id_unique";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;