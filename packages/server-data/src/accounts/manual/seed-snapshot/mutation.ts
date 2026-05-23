import { upsertManualBalanceSnapshotsForUser } from "../../../snapshots/mutations.js";

/** Force a today-snapshot upsert for the user's manual accounts. */
export async function seedManualSnapshot(userId: string): Promise<void> {
  await upsertManualBalanceSnapshotsForUser(userId, "manual-create");
}
