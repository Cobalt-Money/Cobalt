import { createBuilder, createSchema } from "@rocicorp/zero";

// ── Tables ──────────────────────────────────────────────────────────
// Add your table definitions here using:
//   const myTable = table("my_table").columns({ ... }).primaryKey("id")

// ── Relationships ───────────────────────────────────────────────────
// Add relationships here using:
//   const myRelationships = relationships(myTable, ({ one, many }) => ({ ... }))

// ── Schema ──────────────────────────────────────────────────────────

export const schema = createSchema({
  enableLegacyMutators: false,
  enableLegacyQueries: false,
  relationships: [],
  tables: [],
});

export const zql = createBuilder(schema);

export type Schema = typeof schema;
