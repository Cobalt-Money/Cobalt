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
    async createDecline(values: {
      inviteId: string;
      declinedByUserId: string;
      declinedAt: Date;
    }): Promise<void> {
      await db.create({
        data: { ...values, id: crypto.randomUUID() },
        model: "socialInviteDecline",
      });
    },

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

    findDecline(inviteId: string, declinedByUserId: string): Promise<{ id: string } | null> {
      return db.findOne<{ id: string }>({
        model: "socialInviteDecline",
        where: [
          { field: "inviteId", value: inviteId },
          { connector: "AND", field: "declinedByUserId", value: declinedByUserId },
        ],
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

    async listDeclinedInviteIds(declinedByUserId: string): Promise<Set<string>> {
      const rows = await db.findMany<{ inviteId: string }>({
        model: "socialInviteDecline",
        where: [{ field: "declinedByUserId", value: declinedByUserId }],
      });
      return new Set(rows.map((r) => r.inviteId));
    },

    async listPending(userId: string, email: string | null, now: Date): Promise<InviteRecord[]> {
      const [candidates, declinedIds] = await Promise.all([
        db.findMany<InviteRecord>({
          model: "socialInvite",
          where: email
            ? [
                { connector: "OR", field: "targetUserId", value: userId },
                { connector: "OR", field: "targetEmail", value: email },
              ]
            : [{ field: "targetUserId", value: userId }],
        }),
        (async () => {
          const rows = await db.findMany<{ inviteId: string }>({
            model: "socialInviteDecline",
            where: [{ field: "declinedByUserId", value: userId }],
          });
          return new Set(rows.map((r) => r.inviteId));
        })(),
      ]);
      return candidates.filter(
        (i) =>
          i.usesCount < i.maxUses &&
          i.revokedAt === null &&
          new Date(i.expiresAt).getTime() > now.getTime() &&
          !declinedIds.has(i.id),
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
