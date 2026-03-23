import { db } from "@cobalt-web/db";
import { subscription, user } from "@cobalt-web/db/schema/auth";
import { eq } from "drizzle-orm";

/** Sets `lastSeenAt` to now for the given user. */
export async function updateLastSeen(userId: string) {
  const now = new Date();
  await db.update(user).set({ lastSeenAt: now }).where(eq(user.id, userId));
  return {
    lastSeenAt: now.toISOString(),
    shouldShowUpdates: false as const,
  };
}

/**
 * Permanently deletes a user account and all cascade-linked data.
 *
 * - Stripe `subscription` rows have no FK → user, so they are removed explicitly.
 * - Deleting the `user` row cascades to: session, account, and all banking /
 *   brokerage tables that reference `user.id` with ON DELETE CASCADE.
 */
export async function deleteUserAccount(userId: string) {
  // Stripe subscriptions aren't FK-linked to user → delete first
  await db.delete(subscription).where(eq(subscription.referenceId, userId));

  // Delete user — cascades to sessions, OAuth accounts, and all FK-linked rows
  await db.delete(user).where(eq(user.id, userId));

  return { message: "Account deleted successfully", success: true as const };
}
