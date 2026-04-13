import { db } from "@cobalt-web/db";

import {
  mobileSubscriptionGrantsAccess,
  stripeSubscriptionGrantsAccess,
} from "./predicates.js";

export type SubscriptionSource = "stripe" | "appstore" | null;

/**
 * Returns true if the user has an active Stripe (Better Auth) subscription and/or
 * an active App Store subscription row, based on DB state only.
 */
export async function userHasActiveSubscription(
  userId: string
): Promise<boolean> {
  return (await userSubscriptionSource(userId)) !== null;
}

/**
 * Returns the source of the user's active subscription: "stripe", "appstore",
 * or null if no active subscription exists. Stripe is checked first.
 */
export async function userSubscriptionSource(
  userId: string
): Promise<SubscriptionSource> {
  const now = new Date();

  const stripeRows = await db.query.subscription.findMany({
    where: { referenceId: { eq: userId } },
  });

  if (stripeRows.some((row) => stripeSubscriptionGrantsAccess(row, now))) {
    return "stripe";
  }

  const mobileRows = await db.query.mobileSubscription.findMany({
    where: { userId: { eq: userId } },
  });

  if (mobileRows.some((row) => mobileSubscriptionGrantsAccess(row, now))) {
    return "appstore";
  }

  return null;
}
