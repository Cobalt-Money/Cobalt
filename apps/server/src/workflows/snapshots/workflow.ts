import {
  createPlaidBalanceSnapshotsForUserStep,
  createSnapTradeSnapshotsForUserStep,
  createPlaidInvestmentSnapshotsForUserStep,
} from "./steps";

/**
 * Per-user snapshot workflow.
 * Dispatched by the /api/cron/snapshots route — one invocation per user.
 * Each step has "use step" for automatic retry on RetryableError.
 */
export async function snapshotUserWorkflow(userId: string) {
  "use workflow";

  // Step 1: Plaid balance snapshots (bank accounts)
  await createPlaidBalanceSnapshotsForUserStep(userId);

  // Step 2: SnapTrade brokerage snapshots
  await createSnapTradeSnapshotsForUserStep(userId);

  // Step 3: Plaid investment snapshots
  await createPlaidInvestmentSnapshotsForUserStep(userId);
}
