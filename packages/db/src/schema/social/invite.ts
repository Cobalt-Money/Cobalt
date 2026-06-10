import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

/**
 * Share-link invite (unbound capability URL). One row per invite created by
 * a user. Anyone with the token can redeem until `expires_at` or `max_uses`
 * is hit, unless `revoked_at` is set. Pattern matches Slack workspace invite
 * link / WhatsApp group join link.
 *
 * Direct (email/phone-bound) invites are not v1 — add `kind` enum later.
 */
export const socialInvite = pgTable(
  "social_invite",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    inviterUserId: text("inviter_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /**
     * Discriminator. Drives the redemption handler:
     *   - 'friendship' → insert social_friendship row (peer edge)
     *   - 'family'     → call Better Auth Org plugin acceptInvitation (joint Cobalt plan, shared root data)
     *   - 'team'       → call Better Auth Org plugin acceptInvitation w/ role
     *
     * One token table, multiple effects. New kinds add a case in the redeem
     * handler, no schema change.
     */
    kind: text("kind").default("friendship").notNull(),
    maxUses: integer("max_uses").default(10).notNull(),
    /**
     * Set only when `kind` resolves to an Org-plugin org (household/team).
     * Null for friendship invites. Loose FK — Org plugin owns the org table.
     */
    organizationId: text("organization_id"),
    revokedAt: timestamp("revoked_at"),
    /**
     * Optional role for org-scoped invites (household/team). Ignored for friendship.
     */
    role: text("role"),
    /**
     * Set when inviter targets an email (recipient may or may not have an
     * account yet). Lowercased + trimmed at insert. Redemption matches when
     * session.user.email === target_email. Post-signup hook scans this column
     * to auto-redeem invites waiting for a newly-created user.
     *
     * Both `targetUserId` and `targetEmail` null = open capability URL.
     */
    targetEmail: text("target_email"),
    /**
     * Set when inviter targets a phone number. E.164 normalized at insert.
     * Same auto-redeem-on-signup semantics as `targetEmail`.
     */
    targetPhone: text("target_phone"),
    /**
     * Set when inviter picks an existing Cobalt user (resolved via Better Auth
     * Username plugin handle lookup at create time). Only this user can redeem.
     */
    targetUserId: text("target_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    token: text("token").notNull().unique(),
    usesCount: integer("uses_count").default(0).notNull(),
  },
  (table) => [
    index("social_invite_inviter_idx").on(table.inviterUserId),
    index("social_invite_token_idx").on(table.token),
    index("social_invite_kind_idx").on(table.kind),
    index("social_invite_target_user_idx").on(table.targetUserId),
    index("social_invite_target_email_idx").on(table.targetEmail),
    index("social_invite_target_phone_idx").on(table.targetPhone),
  ],
);

/**
 * Audit + dedupe ledger for invite redemptions. Unique on (invite_id, redeemer)
 * prevents the same user redeeming the same link twice. Re-tap of a link by
 * the same user is a no-op redirect, not a duplicate redemption.
 */
export const socialInviteRedemption = pgTable(
  "social_invite_redemption",
  {
    id: text("id").primaryKey(),
    inviteId: text("invite_id")
      .notNull()
      .references(() => socialInvite.id, { onDelete: "cascade" }),
    redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
    redeemerUserId: text("redeemer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("social_invite_redemption_unique").on(table.inviteId, table.redeemerUserId),
    index("social_invite_redemption_redeemer_idx").on(table.redeemerUserId),
  ],
);

/**
 * Per-recipient decline ledger. Lets a targeted recipient (or any user a
 * pending invite was offered to) suppress an invite from their pending list
 * without revoking it for other potential redeemers. Inviter still sees the
 * row in `listSent`; recipient just stops seeing it in `listPending`.
 *
 * Unique on (invite_id, decliner_user_id) — a re-decline is a no-op.
 */
export const socialInviteDecline = pgTable(
  "social_invite_decline",
  {
    declinedAt: timestamp("declined_at").defaultNow().notNull(),
    declinedByUserId: text("declined_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    id: text("id").primaryKey(),
    inviteId: text("invite_id")
      .notNull()
      .references(() => socialInvite.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("social_invite_decline_unique").on(table.inviteId, table.declinedByUserId),
    index("social_invite_decline_decliner_idx").on(table.declinedByUserId),
  ],
);
