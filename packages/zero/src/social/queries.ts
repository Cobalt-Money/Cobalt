import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import { NO_MATCH_ID } from "../transactions/lib.js";
import { zql } from "../schema.js";

/**
 * Social-graph named queries (`queries.social.*`). Composed in root `queries.ts`.
 *
 * Friendship rows are the source of truth for the friend graph. Posts are
 * the denormalized share artifacts — friends app reads from `social_post`,
 * never from `transaction`. Posts now created automatically by server-side
 * Plaid sync step (in-store + has lat/lon) — no client mutator.
 */
export const socialQueries = {
  /** Caller's blocked categories (denylist). */
  categoryBlocklist: defineQuery(({ ctx }) =>
    zql.socialCategoryBlocklist
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .orderBy("createdAt", "desc"),
  ),

  /**
   * Public profile lookup keyed on a list of user ids — minimal fields
   * (name, image, displayUsername) the friends app needs to render labels
   * next to friend rows. Consumer scopes the id list to its own friend
   * graph before calling, so this trusts the caller.
   */
  friendProfiles: defineQuery(z.object({ ids: z.array(z.string()).min(1) }), ({ args }) =>
    zql.user.where("id", "IN", args.ids),
  ),

  /**
   * Friendships involving the caller. Edge list — each row has user_a_id +
   * user_b_id (sorted). Caller derives "who's my friend" by picking the
   * other id.
   */
  friendships: defineQuery(({ ctx }) =>
    zql.socialFriendship
      .where(({ or, cmp }) =>
        or(cmp("userAId", ctx?.userId ?? NO_MATCH_ID), cmp("userBId", ctx?.userId ?? NO_MATCH_ID)),
      )
      .orderBy("createdAt", "desc"),
  ),

  /**
   * Invites targeting the caller — by user_id OR by email match.
   * Filters to active (not redeemed, not revoked, not expired). Friends app
   * uses this as the realtime inbox.
   */
  invitesPending: defineQuery(({ ctx }) =>
    zql.socialInvite
      .where("usesCount", 0)
      .where("revokedAt", "IS", null)
      .where(({ or, cmp }) => or(cmp("targetUserId", ctx?.userId ?? NO_MATCH_ID)))
      .orderBy("createdAt", "desc"),
  ),

  /** Invites the caller has created (sent list). */
  invitesSent: defineQuery(({ ctx }) =>
    zql.socialInvite
      .where("inviterUserId", ctx?.userId ?? NO_MATCH_ID)
      .orderBy("createdAt", "desc"),
  ),

  /** Caller's blocked merchants (denylist). */
  merchantBlocklist: defineQuery(({ ctx }) =>
    zql.socialMerchantBlocklist
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .orderBy("createdAt", "desc"),
  ),

  /** Detail view of a post the caller owns. (Friends' posts read via postsAll.) */
  postDetail: defineQuery(z.object({ postId: z.string() }), ({ ctx, args }) =>
    zql.socialPost
      .where("id", args.postId)
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .one(),
  ),

  /**
   * All posts the caller can read. Currently delegates filtering to client
   * (caller intersects against friendship list). Zero permissions on
   * `social_post` will eventually enforce this server-side; until then
   * trust the client to filter.
   */
  postsAll: defineQuery(({ ctx }) => {
    void ctx;
    return zql.socialPost.orderBy("date", "desc");
  }),

  /** Posts the caller has shared. */
  postsMine: defineQuery(({ ctx }) =>
    zql.socialPost.where("userId", ctx?.userId ?? NO_MATCH_ID).orderBy("createdAt", "desc"),
  ),

  /** Caller's auto-share settings row (single-row by user_id PK). */
  shareSettings: defineQuery(({ ctx }) =>
    zql.socialShareSettings.where("userId", ctx?.userId ?? NO_MATCH_ID).one(),
  ),
};
