import type { Subscription } from "@cobalt-web/db/schema/auth";
import type { MobileSubscription } from "@cobalt-web/db/schema/mobile/subscriptions";

/**
 * Stripe/Better Auth subscription statuses that grant access to paid features.
 *
 * - `active` / `trialing`: standard Stripe “provision access” states.
 * - `past_due`: intentional grace while Stripe retries failed payment (see Stripe
 *   subscription lifecycle). Stricter apps often omit this and only allow
 *   `active` / `trialing` (closer to Better Auth client examples).
 */
const STRIPE_ENTITLED_STATUSES = new Set(["active", "past_due", "trialing"]);

/**
 * Pure predicate: whether a Stripe-backed subscription row grants access at `now`.
 * Better Auth + webhooks keep this table in sync; we do not call Stripe per request.
 */
export function stripeSubscriptionGrantsAccess(
  sub: Pick<Subscription, "cancelAtPeriodEnd" | "periodEnd" | "status">,
  now: Date
): boolean {
  if (STRIPE_ENTITLED_STATUSES.has(sub.status)) {
    return true;
  }
  // User canceled but is still within the paid period (Stripe keeps access until period end).
  if (sub.cancelAtPeriodEnd && sub.periodEnd !== null && sub.periodEnd > now) {
    return true;
  }
  return false;
}

/**
 * Pure predicate: whether an App Store subscription row grants access at `now`.
 */
export function mobileSubscriptionGrantsAccess(
  sub: Pick<MobileSubscription, "expiresAt" | "status">,
  now: Date
): boolean {
  if (sub.status !== "active") {
    return false;
  }
  if (sub.expiresAt === null) {
    return true;
  }
  return sub.expiresAt > now;
}
