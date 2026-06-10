import { defineQuery } from "@rocicorp/zero";
import { z } from "zod";

import { NO_MATCH_ID } from "../transactions/lib.js";
import { zql } from "../schema.js";
import { DEMO_NETWORK_IDS, DEMO_USER_ID } from "./constants.js";

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
  friendProfiles: defineQuery(z.object({ ids: z.array(z.string()).min(1) }), ({ args, ctx }) => {
    // Authed callers: trust the id list (consumer pre-scopes to their friend
    // graph). Anon callers: intersect against the demo network so a malicious
    // client can't enumerate real user profiles via this query.
    const ids = ctx?.userId
      ? args.ids
      : args.ids.filter((id) => (DEMO_NETWORK_IDS as readonly string[]).includes(id));
    if (ids.length === 0) {
      return zql.user.where("id", NO_MATCH_ID);
    }
    return zql.user.where("id", "IN", ids);
  }),

  /**
   * Friendships involving the caller. Edge list — each row has user_a_id +
   * user_b_id (sorted). Caller derives "who's my friend" by picking the
   * other id.
   */
  friendships: defineQuery(({ ctx }) => {
    // Anon callers read the demo user's friend graph so the landing-page
    // map renders without auth. See packages/zero/src/social/constants.ts.
    const callerId = ctx?.userId ?? DEMO_USER_ID;
    return zql.socialFriendship
      .where(({ or, cmp }) => or(cmp("userAId", callerId), cmp("userBId", callerId)))
      .orderBy("createdAt", "desc");
  }),

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
      .where("userId", ctx?.userId ?? DEMO_USER_ID)
      .one(),
  ),

  /**
   * All posts the caller can read. Authed: returns everything; client
   * intersects against friendship list. Anon: restricted server-side to
   * the seeded demo network so we never leak real users' posts to the
   * landing page.
   *
   * V2: replace with server-side feed scoped via row permissions.
   */
  postsAll: defineQuery(({ ctx }) => {
    if (!ctx?.userId) {
      return zql.socialPost
        .where("userId", "IN", DEMO_NETWORK_IDS as readonly string[] as string[])
        .orderBy("date", "desc");
    }
    return zql.socialPost.orderBy("date", "desc");
  }),

  /** Posts the caller has shared. */
  postsMine: defineQuery(({ ctx }) =>
    zql.socialPost.where("userId", ctx?.userId ?? DEMO_USER_ID).orderBy("createdAt", "desc"),
  ),

  /** Caller's auto-share settings row (single-row by user_id PK). */
  shareSettings: defineQuery(({ ctx }) =>
    zql.socialShareSettings.where("userId", ctx?.userId ?? NO_MATCH_ID).one(),
  ),
};
