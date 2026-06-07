import { and, eq, or } from "drizzle-orm";

import { db } from "../index";
import { socialFriendship } from "../schema/social/friendship";

/**
 * Insert a bidirectional friendship edge. Canonicalizes the pair by sorting
 * user ids lexicographically so the unique index `(user_a_id, user_b_id)`
 * catches duplicate-from-other-direction inserts.
 *
 * Idempotent: returns the existing row if the edge already exists. Safe to
 * call from both the invite redemption side effect and direct-add flows
 * (later, if/when handle-based friend add lands).
 *
 * Lives in @cobalt-web/db (not server-data) so packages/auth can call it
 * from the invite plugin's onAccept hook without inverting layering. Mirrors
 * the `seedDemoUser` precedent: lifecycle-hook-shaped DB mutations live here.
 */
export async function createFriendship(userOne: string, userTwo: string) {
  if (userOne === userTwo) {
    throw new Error("createFriendship: cannot friend self");
  }
  const [userAId, userBId] = [userOne, userTwo].toSorted() as [string, string];

  const existing = await db
    .select()
    .from(socialFriendship)
    .where(and(eq(socialFriendship.userAId, userAId), eq(socialFriendship.userBId, userBId)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [row] = await db.insert(socialFriendship).values({ userAId, userBId }).returning();
  return row;
}

/**
 * Remove a friendship edge. Either user can end the relationship.
 * Idempotent — no-op if the edge doesn't exist.
 */
export async function removeFriendship(userOne: string, userTwo: string) {
  const [userAId, userBId] = [userOne, userTwo].toSorted() as [string, string];
  await db
    .delete(socialFriendship)
    .where(and(eq(socialFriendship.userAId, userAId), eq(socialFriendship.userBId, userBId)));
}

/** Quick existence check used by mutual-friend queries + invite UI. */
export async function areFriends(userOne: string, userTwo: string) {
  if (userOne === userTwo) {
    return false;
  }
  const [userAId, userBId] = [userOne, userTwo].toSorted() as [string, string];
  const rows = await db
    .select({ id: socialFriendship.id })
    .from(socialFriendship)
    .where(and(eq(socialFriendship.userAId, userAId), eq(socialFriendship.userBId, userBId)))
    .limit(1);
  return rows.length > 0;
}

export function listFriends(userId: string) {
  return db
    .select()
    .from(socialFriendship)
    .where(or(eq(socialFriendship.userAId, userId), eq(socialFriendship.userBId, userId)));
}
