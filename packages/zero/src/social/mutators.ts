import { defineMutator } from "@rocicorp/zero";
import { z } from "zod";

import { zql } from "../schema.js";

const removeFriendshipSchema = z.object({ friendshipId: z.uuid() });
const declineInviteSchema = z.object({ declineId: z.string(), inviteId: z.string() });

/**
 * Social mutators (`mutators.social.*`). Posts are now created server-side
 * by the Plaid sync auto-share step — no client create/update/delete path.
 * Field-level redaction is controlled by `social_share_settings`, written via
 * REST (`/api/user/sharingSettings`), not Zero mutators.
 */
export const socialMutators = {
  friendships: {
    remove: defineMutator(removeFriendshipSchema, async ({ args, ctx, tx }) => {
      if (!ctx?.userId) {
        throw new Error("Unauthorized");
      }
      const row = await tx.run(zql.socialFriendship.where("id", args.friendshipId).one());
      if (!row) {
        throw new Error("Friendship not found");
      }
      if (row.userAId !== ctx.userId && row.userBId !== ctx.userId) {
        throw new Error("Not a member of this friendship");
      }
      await tx.mutate.socialFriendship.delete({ id: args.friendshipId });
    }),
  },
  invites: {
    /**
     * Recipient suppresses an invite from their pending list. Idempotent —
     * a unique index on (invite_id, declined_by_user_id) prevents dupes; we
     * rely on `onConflictDoNothing` semantics by checking first.
     */
    decline: defineMutator(declineInviteSchema, async ({ args, ctx, tx }) => {
      if (!ctx?.userId) {
        throw new Error("Unauthorized");
      }
      const invite = await tx.run(zql.socialInvite.where("id", args.inviteId).one());
      if (!invite) {
        throw new Error("Invite not found");
      }
      // Recipient must be the targeted user. Email-targeted + open-link invites
      // require server-side email match, handled by the REST decline path.
      if (invite.targetUserId !== ctx.userId) {
        throw new Error("Not the invite recipient");
      }
      const existing = await tx.run(
        zql.socialInviteDecline
          .where("inviteId", args.inviteId)
          .where("declinedByUserId", ctx.userId)
          .one(),
      );
      if (existing) {
        return;
      }
      await tx.mutate.socialInviteDecline.insert({
        declinedByUserId: ctx.userId,
        id: args.declineId,
        inviteId: args.inviteId,
      });
    }),
  },
};
