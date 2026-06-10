import { pgSchema } from "drizzle-orm/pg-core";

// Server-only tables live in `enrichment`. Zero's default publication is
// `FOR TABLES IN SCHEMA public`, so anything here is automatically excluded
// from client sync without needing per-table publication maintenance.
// See SRI-244 for the history.
export const enrichmentSchema = pgSchema("enrichment");
