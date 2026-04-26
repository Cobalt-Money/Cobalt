-- no-op: snapshot alignment after _v2 → final collapse migration
-- (20260425084618_unify_collapse_v2_to_final). That migration renamed
-- _v2 tables in SQL but, because it was a --custom migration, drizzle-kit
-- did not regenerate its snapshot. This migration's snapshot.json captures
-- the true post-collapse state so future `drizzle-kit generate` runs diff
-- against reality. The SQL is intentionally empty.
SELECT 1;
