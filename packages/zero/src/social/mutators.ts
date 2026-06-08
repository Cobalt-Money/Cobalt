import { defineMutator } from "@rocicorp/zero";
import { z } from "zod";

import { zql } from "../schema.js";

const removeFriendshipSchema = z.object({ friendshipId: z.uuid() });

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
};
