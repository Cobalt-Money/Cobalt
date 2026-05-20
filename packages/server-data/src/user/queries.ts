import { db } from "@cobalt-web/db";

/** Number of hours before financial updates should be shown again. */
const UPDATE_THRESHOLD_HOURS = 24;

/**
 * Returns true if the user is anonymous (demo). Used by MCP to reject
 * sessions backed by demo users — their rows get purged by the 24h cron
 * and external clients would silently break.
 */
export async function isAnonymousUser(userId: string): Promise<boolean> {
  const row = await db.query.user.findFirst({
    columns: { isAnonymous: true },
    where: { id: { eq: userId } },
  });
  return row?.isAnonymous ?? false;
}

/**
 * Returns distinct userIds that have at least one connected Plaid bank
 * connection, SnapTrade brokerage user, or manually-created financial
 * account. Used by cron fan-out (e.g. daily snapshots) to know who needs a
 * per-user workflow dispatched.
 */
export async function getUserIdsWithConnectedAccounts(): Promise<string[]> {
  const [bankUsers, brokerageUsers, manualUsers] = await Promise.all([
    db.query.plaidConnection.findMany({ columns: { userId: true } }),
    db.query.snaptradeUser.findMany({ columns: { userId: true } }),
    db.query.financialAccount.findMany({
      columns: { userId: true },
      where: { source: { eq: "manual" } },
    }),
  ]);

  const ids = new Set<string>();
  for (const row of bankUsers) {
    ids.add(row.userId);
  }
  for (const row of brokerageUsers) {
    ids.add(row.userId);
  }
  for (const row of manualUsers) {
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
