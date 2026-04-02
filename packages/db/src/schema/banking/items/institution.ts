import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { appFullAccess, agentSelectPublic } from "../../rls";
import type { StringArrayJson } from "./zod";

export const institution = pgTable.withRLS(
  "institution",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    logo: text("logo"),
    name: text("name").notNull(),
    oauth: boolean("oauth").default(false).notNull(),
    plaidInstitutionId: text("plaid_institution_id").notNull().unique(),
    primaryColor: text("primary_color"),
    routingNumbers: jsonb("routing_numbers").$type<StringArrayJson>(),
    status: text("status"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    url: text("url"),
  },
  (table) => [
    index("institution_provider_id_idx").on(table.plaidInstitutionId),
    index("institution_name_idx").on(table.name),
    appFullAccess(),
    agentSelectPublic(),
  ]
);

export type Institution = typeof institution.$inferInsert;
export type InstitutionSelect = typeof institution.$inferSelect;
