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

  /** Decline rows the caller has written — used to filter pending list. */
  invitesDeclined: defineQuery(({ ctx }) =>
    zql.socialInviteDecline.where("declinedByUserId", ctx?.userId ?? NO_MATCH_ID),
  ),

  /**
   * Invites targeting the caller — by user_id OR by email match.
   * Filters to active (not redeemed, not revoked). Caller filters declined
   * invites client-side via `invitesDeclined`.
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

  /**
   * Shared-transaction detail keyed by source txn id. Friends app uses this
   * for the txn detail panel — raw `transaction` rows are never exposed to
   * viewers outside the owner. Scoped to the caller + their friend graph
   * (or the demo network for anon).
   */
  postByTransactionId: defineQuery(
    z.object({
      friendIds: z.array(z.string()).default([]),
      transactionId: z.string(),
    }),
    ({ args, ctx }) => {
      const allowed = ctx?.userId
        ? ([...new Set([ctx.userId, ...args.friendIds])] as string[])
        : (DEMO_NETWORK_IDS as readonly string[] as string[]);
      return zql.socialPost
        .where("transactionId", args.transactionId)
        .where("userId", "IN", allowed)
        .one();
    },
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
  postsAll: defineQuery(
    z.object({ friendIds: z.array(z.string()).default([]) }).default({ friendIds: [] }),
    ({ args, ctx }) => {
      if (!ctx?.userId) {
        return zql.socialPost
          .where("userId", "IN", DEMO_NETWORK_IDS as readonly string[] as string[])
          .orderBy("date", "desc");
      }
      // Authed: scope to viewer's own posts + posts by users in their friend graph.
      // Caller pre-resolves friendIds from `queries.social.friendships()`.
      const allowed = [...new Set([ctx.userId, ...args.friendIds])];
      return zql.socialPost.where("userId", "IN", allowed).orderBy("date", "desc");
    },
  ),

  /** Posts the caller has shared. */
  postsMine: defineQuery(({ ctx }) =>
    zql.socialPost.where("userId", ctx?.userId ?? DEMO_USER_ID).orderBy("createdAt", "desc"),
  ),

  /** Caller's auto-share settings row (single-row by user_id PK). */
  shareSettings: defineQuery(({ ctx }) =>
    zql.socialShareSettings.where("userId", ctx?.userId ?? NO_MATCH_ID).one(),
  ),
};
