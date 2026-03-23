import { db } from "@cobalt-web/db";

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

  const stripeRows = await db.query.subscription.findMany({
    where: { referenceId: { eq: userId } },
  });

  if (stripeRows.some((row) => stripeSubscriptionGrantsAccess(row, now))) {
    return true;
  }

  const mobileRows = await db.query.mobileSubscription.findMany({
    where: { userId: { eq: userId } },
  });

  return mobileRows.some((row) => mobileSubscriptionGrantsAccess(row, now));
}
