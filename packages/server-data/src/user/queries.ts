import { db } from "@cobalt-web/db";

/** Number of hours before financial updates should be shown again. */
const UPDATE_THRESHOLD_HOURS = 24;

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
    const hoursSinceLastSeen =
      (Date.now() - lastSeenAt.getTime()) / (1000 * 60 * 60);
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
