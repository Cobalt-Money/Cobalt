import { db } from "@cobalt-web/db";

/** Number of hours before financial updates should be shown again. */
const UPDATE_THRESHOLD_HOURS = 24;

/**
 * Returns distinct userIds that have at least one connected Plaid bank
 * connection or SnapTrade brokerage user. Used by cron fan-out (e.g. daily
 * snapshots) to know who needs a per-user workflow dispatched.
 */
export async function getUserIdsWithConnectedAccounts(): Promise<string[]> {
  const [bankUsers, brokerageUsers] = await Promise.all([
    db.query.plaidConnection.findMany({ columns: { userId: true } }),
    db.query.snaptradeUser.findMany({ columns: { userId: true } }),
  ]);

  const ids = new Set<string>();
  for (const row of bankUsers) {
    ids.add(row.userId);
  }
  for (const row of brokerageUsers) {
    ids.add(row.userId);
  }
  return [...ids];
}

/**
 * Returns the user's `lastSeenAt` timestamp (ISO string or null) and whether
 * the mobile app should show financial updates.
 * Threshold logic lives server-side so clients don't duplicate it.
 */
export async function getUserLastSeen(userId: string) {
  const row = await db.query.user.findFirst({
    columns: { lastSeenAt: true },
    where: { id: { eq: userId } },
  });

  const lastSeenAt = row?.lastSeenAt ?? null;

  let shouldShowUpdates: boolean;
  if (lastSeenAt) {
    const hoursSinceLastSeen = (Date.now() - lastSeenAt.getTime()) / (1000 * 60 * 60);
    shouldShowUpdates = hoursSinceLastSeen >= UPDATE_THRESHOLD_HOURS;
  } else {
    // First time — user has never dismissed updates → always show
    shouldShowUpdates = true;
  }

  return {
    lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
    shouldShowUpdates,
  };
}
