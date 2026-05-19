import { stripeClient } from "@cobalt-web/auth";
import { db } from "@cobalt-web/db";

import { ApiError } from "../_shared/api-error.js";

/**
 * Creates a Stripe billing portal session for the given user.
 *
 * Reads the Stripe customer ID directly from `user.stripe_customer_id` rather
 * than going through Better Auth's `createBillingPortal` API, which requires a
 * separate `customer` table that this project does not use.
 */
export async function createBillingPortalSession(
  userId: string,
  returnUrl: string,
): Promise<string> {
  const user = await db.query.user.findFirst({
    columns: { stripeCustomerId: true },
    where: { id: { eq: userId } },
  });

  const customerId = user?.stripeCustomerId;
  if (!customerId) {
    throw new ApiError(409, "stripe_customer_missing", "No Stripe customer for this user");
  }

  try {
    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  } catch (error) {
    console.error("[createBillingPortalSession] Stripe call failed", error);
    throw new ApiError(502, "stripe_upstream_failed", "Failed to create billing portal session");
  }
}
