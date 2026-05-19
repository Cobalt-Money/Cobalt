import { stripeClient } from "@cobalt-web/auth";
import { plaidClient } from "@cobalt-web/clients/plaid";
import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import { db } from "@cobalt-web/db";
import { user } from "@cobalt-web/db/schema/users/auth/auth";
import { subscription } from "@cobalt-web/db/schema/users/subscriptions/stripe";
import { and, eq, lt } from "drizzle-orm";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Deletes the user row only. Cascades to sessions and all owned data via
 * `onDelete: "cascade"` on user.id. Does NOT clean up external providers
 * (Plaid, Stripe, SnapTrade) — use `deleteUserAccount` for that.
 *
 * Intended for anonymous/demo users with no external resources.
 */
export async function deleteUser(userId: string) {
  await db.delete(user).where(eq(user.id, userId));
}

/**
 * Deletes anonymous (demo) users older than `cutoff`. Cascades wipe their
 * accounts/transactions/holdings via `onDelete: "cascade"` on user.id.
 * Returns the deleted user IDs for logging.
 */
export async function deleteStaleAnonymousUsers(cutoff: Date): Promise<string[]> {
  const deleted = await db
    .delete(user)
    .where(and(eq(user.isAnonymous, true), lt(user.createdAt, cutoff)))
    .returning({ id: user.id });
  return deleted.map((r) => r.id);
}

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
 * External cleanup runs first so third-party services stop billing/syncing,
 * then the DB cascade deletes everything else. Each external step is wrapped
 * so a single 3rd-party failure can't strand the user with their data half-deleted.
 *
 * 1. SnapTrade — revoke each brokerage authorization (provider stops syncing)
 * 2. Plaid — revoke each item access token (provider stops billing)
 * 3. Stripe — cancel active subscriptions (Stripe customer is intentionally
 *    KEPT so we can detect free-trial abuse if the user signs up again — trial
 *    eligibility is checked against Stripe customer history at checkout)
 * 4. Subscription rows — no FK to user, must delete explicitly
 * 5. User row — cascades to session, account, oauth*, plaidConnection,
 *    brokerage*, portfolioSnapshots, kalshiUsers, financialGoals, feedback,
 *    chats/messages, and every other table with `onDelete: "cascade"` on user.id
 */
export async function deleteUserAccount(userId: string) {
  await revokeSnapTradeAuthorizations(userId);
  await revokePlaidItems(userId);
  await cancelActiveStripeSubscriptions(userId);

  await db.delete(subscription).where(eq(subscription.referenceId, userId));
  await db.delete(user).where(eq(user.id, userId));

  return { message: "Account deleted successfully", success: true as const };
}

async function revokeSnapTradeAuthorizations(userId: string) {
  try {
    const creds = await db.query.snaptradeUser.findFirst({
      columns: { snaptradeUserId: true },
      where: { userId: { eq: userId } },
    });
    if (!creds) {
      return;
    }

    // Single admin call deletes the SnapTrade user and revokes every
    // authorization on their side — replaces an N+1 loop over auths.
    await snaptradeClient.authentication.deleteSnapTradeUser({
      userId: creds.snaptradeUserId,
    });
  } catch (error) {
    console.warn("[deleteUserAccount] SnapTrade user delete failed", error);
  }
  // brokerageUser + brokerageAuthorizations rows fall to the user cascade
}

async function revokePlaidItems(userId: string) {
  try {
    const items = await db.query.plaidConnection.findMany({
      columns: { plaidAccessToken: true },
      where: { userId: { eq: userId } },
    });

    for (const item of items) {
      if (!item.plaidAccessToken) {
        continue;
      }
      try {
        await plaidClient.itemRemove({ access_token: item.plaidAccessToken });
      } catch (error) {
        console.warn("[deleteUserAccount] Plaid itemRemove failed", error);
      }
    }
  } catch (error) {
    console.error("[deleteUserAccount] Plaid cleanup error", error);
  }
  // plaidConnection rows (and cascading bank accounts/balances/transactions)
  // fall to the user cascade
}

async function cancelActiveStripeSubscriptions(userId: string) {
  try {
    const subs = await db.query.subscription.findMany({
      columns: { status: true, stripeSubscriptionId: true },
      where: {
        referenceId: { eq: userId },
        stripeSubscriptionId: { isNotNull: true },
      },
    });

    for (const sub of subs) {
      if (!sub.stripeSubscriptionId || !ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status)) {
        continue;
      }
      try {
        await stripeClient.subscriptions.cancel(sub.stripeSubscriptionId, {
          invoice_now: false,
          prorate: false,
        });
      } catch (error) {
        const statusCode =
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : undefined;
        // 404 = already cancelled/deleted in Stripe — fine to ignore
        if (statusCode !== 404) {
          console.warn(
            `[deleteUserAccount] Stripe cancel failed for ${sub.stripeSubscriptionId}`,
            error,
          );
        }
      }
    }
  } catch (error) {
    console.error("[deleteUserAccount] Stripe cleanup error", error);
  }
}
