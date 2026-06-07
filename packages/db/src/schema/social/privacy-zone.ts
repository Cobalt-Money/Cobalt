import {
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

/**
 * Geographic exclusion zone — txns whose merchant lat/lon fall within
 * `radius_m` of (lat, lon) are NOT auto-shared to social_post. Mirrors
 * Strava's privacy zones: hide home / work / sensitive locations.
 *
 * Enforced server-side on auto-share write path. Manual share bypasses
 * (user explicitly opted to share, treat as intent override).
 */
export const socialPrivacyZone = pgTable(
  "social_privacy_zone",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    label: text("label"),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    radiusM: integer("radius_m").default(200).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("social_privacy_zone_user_idx").on(table.userId)],
);
