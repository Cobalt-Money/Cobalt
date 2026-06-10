import type { BetterAuthPluginDBSchema } from "better-auth";

/**
 * Plugin schema declaration in Better Auth DSL. Mirrors the Drizzle schema
 * in `@cobalt-web/db/schema/social/invite`. Drizzle owns migrations; this
 * declaration exists so Better Auth's adapter can read/write the fields
 * with type safety and so the plugin client can infer return types.
 *
 * Field names MUST match Drizzle camelCase property names. The actual
 * Postgres column names (snake_case) come from Drizzle's `text(...)`.
 */
export const schema = {
  socialInvite: {
    fields: {
      createdAt: { required: true, type: "date" },
      expiresAt: { required: true, type: "date" },
      inviterUserId: {
        references: { field: "id", model: "user", onDelete: "cascade" },
        required: true,
        type: "string",
      },
      kind: { defaultValue: "friendship", required: true, type: "string" },
      maxUses: { defaultValue: 10, required: true, type: "number" },
      organizationId: { required: false, type: "string" },
      revokedAt: { required: false, type: "date" },
      role: { required: false, type: "string" },
      targetEmail: { required: false, type: "string" },
      targetPhone: { required: false, type: "string" },
      targetUserId: {
        references: { field: "id", model: "user", onDelete: "cascade" },
        required: false,
        type: "string",
      },
      token: { required: true, type: "string", unique: true },
      usesCount: { defaultValue: 0, required: true, type: "number" },
    },
  },
  socialInviteDecline: {
    fields: {
      declinedAt: { required: true, type: "date" },
      declinedByUserId: {
        references: { field: "id", model: "user", onDelete: "cascade" },
        required: true,
        type: "string",
      },
      inviteId: {
        references: { field: "id", model: "socialInvite", onDelete: "cascade" },
        required: true,
        type: "string",
      },
    },
  },
  socialInviteRedemption: {
    fields: {
      inviteId: {
        references: { field: "id", model: "socialInvite", onDelete: "cascade" },
        required: true,
        type: "string",
      },
      redeemedAt: { required: true, type: "date" },
      redeemerUserId: {
        references: { field: "id", model: "user", onDelete: "cascade" },
        required: true,
        type: "string",
      },
    },
  },
} satisfies BetterAuthPluginDBSchema;
