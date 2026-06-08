import type { GenericEndpointContext } from "better-auth";

import type { InviteRecord } from "./types";

/**
 * Thin wrapper around Better Auth's internal DB adapter. Centralizes the
 * field projection + table names so route handlers don't reach into
 * `ctx.context.adapter` directly. Mirrors the better-invite plugin's
 * `getInviteAdapter` pattern.
 */
export function getInviteAdapter(ctx: GenericEndpointContext) {
  const db = ctx.context.adapter;

  return {
    async createInvite(values: Omit<InviteRecord, "id">): Promise<InviteRecord> {
      const row = await db.create<InviteRecord>({
        // social_invite.id is a `uuid` column. Better Auth's default
        // generateId returns a 32-char alphanumeric string which Postgres
        // rejects with "invalid input syntax for type uuid". Pre-assign a
        // real UUID so the adapter skips its own id generation.
        data: { ...values, id: crypto.randomUUID() } as InviteRecord,
        model: "socialInvite",
      });
      return row;
    },

    async createRedemption(values: {
      inviteId: string;
      redeemerUserId: string;
      redeemedAt: Date;
    }): Promise<void> {
      await db.create({
        data: { ...values, id: crypto.randomUUID() },
        model: "socialInviteRedemption",
      });
    },

    findInviteById(id: string): Promise<InviteRecord | null> {
      return db.findOne<InviteRecord>({
        model: "socialInvite",
        where: [{ field: "id", value: id }],
      });
    },

    findInviteByToken(token: string): Promise<InviteRecord | null> {
      return db.findOne<InviteRecord>({
        model: "socialInvite",
        where: [{ field: "token", value: token }],
      });
    },

    findRedemption(
      inviteId: string,
      redeemerUserId: string,
    ): Promise<{ id: string; redeemedAt: Date } | null> {
      return db.findOne<{ id: string; redeemedAt: Date }>({
        model: "socialInviteRedemption",
        where: [
          { field: "inviteId", value: inviteId },
          { connector: "AND", field: "redeemerUserId", value: redeemerUserId },
        ],
      });
    },

    async incrementUses(inviteId: string, usesCount: number): Promise<void> {
      await db.update<InviteRecord>({
        model: "socialInvite",
        update: { usesCount: usesCount + 1 } as Partial<InviteRecord>,
        where: [{ field: "id", value: inviteId }],
      });
    },

    async listPending(userId: string, email: string | null, now: Date): Promise<InviteRecord[]> {
      const candidates = await db.findMany<InviteRecord>({
        model: "socialInvite",
        where: email
          ? [
              { connector: "OR", field: "targetUserId", value: userId },
              { connector: "OR", field: "targetEmail", value: email },
            ]
          : [{ field: "targetUserId", value: userId }],
      });
      return candidates.filter(
        (i) =>
          i.usesCount < i.maxUses &&
          i.revokedAt === null &&
          new Date(i.expiresAt).getTime() > now.getTime(),
      );
    },

    listSent(inviterUserId: string): Promise<InviteRecord[]> {
      return db.findMany<InviteRecord>({
        model: "socialInvite",
        where: [{ field: "inviterUserId", value: inviterUserId }],
      });
    },

    async revoke(inviteId: string, now: Date): Promise<void> {
      await db.update<InviteRecord>({
        model: "socialInvite",
        update: { revokedAt: now } as Partial<InviteRecord>,
        where: [{ field: "id", value: inviteId }],
      });
    },
  };
}

export type InviteAdapter = ReturnType<typeof getInviteAdapter>;
