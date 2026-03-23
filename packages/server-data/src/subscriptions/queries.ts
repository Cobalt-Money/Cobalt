import { db } from "@cobalt-web/db";
import { subscription } from "@cobalt-web/db/schema/auth";
import { mobileSubscription } from "@cobalt-web/db/schema/mobile/subscriptions";
import { eq } from "drizzle-orm";

import {
  mobileSubscriptionGrantsAccess,
  stripeSubscriptionGrantsAccess,
} from "./predicates.js";

/**
 * Returns true if the user has an active Stripe (Better Auth) subscription and/or
 * an active App Store subscription row, based on DB state only.
 */
export async function userHasActiveSubscription(
  userId: string
): Promise<boolean> {
  const now = new Date();

  const stripeRows = await db
    .select()
    .from(subscription)
    .where(eq(subscription.referenceId, userId));

  for (const row of stripeRows) {
    if (stripeSubscriptionGrantsAccess(row, now)) {
      return true;
    }
  }

  const mobileRows = await db
    .select()
    .from(mobileSubscription)
    .where(eq(mobileSubscription.userId, userId));

  return mobileRows.some((row) => mobileSubscriptionGrantsAccess(row, now));
}
