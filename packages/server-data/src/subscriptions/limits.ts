import { db } from "@cobalt-web/db";

import { mobileSubscriptionGrantsAccess, stripeSubscriptionGrantsAccess } from "./predicates.js";
import { userHasActiveSubscription } from "./queries.js";

export const MODELS = {
  haiku: "anthropic/claude-haiku-4.5",
  opus: "anthropic/claude-opus-4.7",
} as const;

export type ModelSlug = (typeof MODELS)[keyof typeof MODELS];

export interface TierLimits {
  readonly connections: number;
  readonly extendedThinking: boolean;
  readonly models: readonly ModelSlug[];
}

export const FREE_LIMITS: TierLimits = {
  connections: 2,
  extendedThinking: false,
  models: [MODELS.haiku],
};

export const PRO_LIMITS: TierLimits = {
  connections: Number.POSITIVE_INFINITY,
  extendedThinking: true,
  models: [MODELS.haiku, MODELS.opus],
};

export async function getUserLimits(userId: string): Promise<TierLimits> {
  return (await userHasActiveSubscription(userId)) ? PRO_LIMITS : FREE_LIMITS;
}

/**
 * Pooled count of active Plaid + SnapTrade connections for a user.
 * Plaid: excludes rows marked pendingDisconnectAt (free slot once flagged).
 * SnapTrade: excludes disabled authorizations.
 */
export async function userConnectionCount(userId: string): Promise<number> {
  const [plaidRows, snapRows] = await Promise.all([
    db.query.plaidConnection.findMany({
      columns: { id: true },
      where: { pendingDisconnectAt: { isNull: true }, userId: { eq: userId } },
    }),
    db.query.snaptradeAuthorization.findMany({
      columns: { id: true },
      where: { isDisabled: { eq: false }, userId: { eq: userId } },
    }),
  ]);
  return plaidRows.length + snapRows.length;
}

export async function userCanAddConnection(userId: string): Promise<boolean> {
  const [limits, count] = await Promise.all([getUserLimits(userId), userConnectionCount(userId)]);
  return count < limits.connections;
}

export type ConnectionKind = "plaid" | "snaptrade";

export interface RankedConnection {
  readonly id: string;
  readonly kind: ConnectionKind;
  readonly createdAt: Date;
  /** External identifier — Plaid item_id or SnapTrade authorization_id; frontend uses this to match cards. */
  readonly externalId: string;
}

/**
 * Active connections (Plaid + SnapTrade), oldest first.
 * Excludes Plaid rows flagged pendingDisconnectAt and disabled SnapTrade authorizations.
 * Free tier keeps the first N (by createdAt asc) within the cap; rest are frozen.
 */
export async function rankConnectionsByCreatedAt(userId: string): Promise<RankedConnection[]> {
  const [plaidRows, snapRows] = await Promise.all([
    db.query.plaidConnection.findMany({
      columns: { createdAt: true, id: true, plaidItemId: true },
      where: { pendingDisconnectAt: { isNull: true }, userId: { eq: userId } },
    }),
    db.query.snaptradeAuthorization.findMany({
      columns: { authorizationId: true, createdAt: true, id: true },
      where: { isDisabled: { eq: false }, userId: { eq: userId } },
    }),
  ]);
  const merged: RankedConnection[] = [
    ...plaidRows.map((r) => ({
      createdAt: r.createdAt,
      externalId: r.plaidItemId,
      id: r.id,
      kind: "plaid" as const,
    })),
    ...snapRows.map((r) => ({
      createdAt: r.createdAt,
      externalId: r.authorizationId,
      id: r.id,
      kind: "snaptrade" as const,
    })),
  ];
  // Tiebreak on id to keep ordering deterministic when createdAt collides.
  merged.sort((a, b) => {
    const t = a.createdAt.getTime() - b.createdAt.getTime();
    return t === 0 ? a.id.localeCompare(b.id) : t;
  });
  return merged;
}

/**
 * Resolve whether a SnapTrade authorization (by its external `authorizationId`)
 * is frozen for its owning user. Returns false when no row exists so callers
 * can ack unknown webhooks safely.
 */
export async function isSnaptradeAuthorizationFrozen(authorizationId: string): Promise<boolean> {
  const row = await db.query.snaptradeAuthorization.findFirst({
    columns: { id: true, userId: true },
    where: { authorizationId: { eq: authorizationId } },
  });
  if (!row) {
    return false;
  }
  return !(await isConnectionActiveForUser(row.userId, row.id, "snaptrade"));
}

/**
 * Whether a given connection is within the user's active slot count.
 * Paid users: always active. Free users: only the oldest N (cap) stay active.
 */
export async function isConnectionActiveForUser(
  userId: string,
  connectionId: string,
  kind: ConnectionKind,
): Promise<boolean> {
  const limits = await getUserLimits(userId);
  if (!Number.isFinite(limits.connections)) {
    return true;
  }
  const ranked = await rankConnectionsByCreatedAt(userId);
  const idx = ranked.findIndex((c) => c.id === connectionId && c.kind === kind);
  if (idx === -1) {
    return false;
  }
  return idx < limits.connections;
}

export type SubscriptionTier = "free" | "pro";

export interface UserSubscriptionState {
  readonly tier: SubscriptionTier;
  readonly status: string | null;
  readonly periodEnd: Date | null;
  readonly cancelAtPeriodEnd: boolean;
  readonly source: "stripe" | "appstore" | null;
}

/**
 * Single snapshot of user's subscription. Merges Stripe + App Store rows.
 * Stripe wins when both present (matches userSubscriptionSource).
 */
export async function getUserSubscriptionState(userId: string): Promise<UserSubscriptionState> {
  const now = new Date();

  const stripeRows = await db.query.subscription.findMany({
    where: { referenceId: { eq: userId } },
  });
  const stripeActive = stripeRows.find((r) =>
    stripeSubscriptionGrantsAccess(r as Parameters<typeof stripeSubscriptionGrantsAccess>[0], now),
  ) as
    | {
        status: string;
        periodEnd: Date | null;
        cancelAtPeriodEnd: boolean | null;
      }
    | undefined;
  if (stripeActive) {
    return {
      cancelAtPeriodEnd: stripeActive.cancelAtPeriodEnd ?? false,
      periodEnd: stripeActive.periodEnd ?? null,
      source: "stripe",
      status: stripeActive.status,
      tier: "pro",
    };
  }

  const mobileRows = await db.query.mobileSubscription.findMany({
    where: { userId: { eq: userId } },
  });
  const mobileActive = mobileRows.find((r) =>
    mobileSubscriptionGrantsAccess(r as Parameters<typeof mobileSubscriptionGrantsAccess>[0], now),
  ) as { status: string; expiresAt: Date | null } | undefined;
  if (mobileActive) {
    return {
      cancelAtPeriodEnd: false,
      periodEnd: mobileActive.expiresAt ?? null,
      source: "appstore",
      status: mobileActive.status,
      tier: "pro",
    };
  }

  return {
    cancelAtPeriodEnd: false,
    periodEnd: null,
    source: null,
    status: null,
    tier: "free",
  };
}
