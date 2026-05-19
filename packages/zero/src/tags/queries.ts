import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import { NO_MATCH_ID } from "../auth.js";
import type { Context } from "../auth.js";
import { zql } from "../schema.js";

/** Tag named queries (`queries.tags.*`). */
export const tagsQueries = {
  forTransaction: defineQuery(z.object({ transactionId: z.string() }), ({ args }) =>
    zql.transactionTag.where("transactionId", args.transactionId),
  ),

  list: defineQuery(({ ctx }: { ctx: Context }) =>
    zql.tag
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .related("transactionTags")
      .orderBy("name", "asc"),
  ),
};
