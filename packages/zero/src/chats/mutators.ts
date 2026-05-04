import { defineMutator } from "@rocicorp/zero";
import { z } from "zod";

import { zql } from "../schema.js";

/** Chat-related mutators (`mutators.chats.*`). Composed in root `mutators.ts`. */
export const chatsMutators = {
  /**
   * Delete a chat owned by the signed-in user. Messages and parts cascade
   * via the Postgres foreign keys on the server; Zero replicates those
   * cascades back to every client replica.
   */
  delete: defineMutator(
    z.object({ chatId: z.string().min(1) }),
    async ({ tx, ctx, args: { chatId } }) => {
      if (!ctx) {
        throw new Error("Not authenticated");
      }
      const chat = await tx.run(
        zql.chats.where("chatId", chatId).where("userId", ctx.userId).one(),
      );
      if (!chat) {
        return;
      }
      await tx.mutate.chats.delete({ chatId });
    },
  ),
};
