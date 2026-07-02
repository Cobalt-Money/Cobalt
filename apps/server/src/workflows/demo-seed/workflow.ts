import {
  checkAlreadySeededStep,
  closeDemoSeedProgressStep,
  emitDemoSeedProgressStep,
  seedAccountsStep,
  seedChatThreadsStep,
  seedHoldingsStep,
  seedInvestmentActivitiesStep,
  seedSnapshotsStep,
  seedTagsStep,
  seedTransactionsStep,
} from "./steps";
import type { DemoSeedPhase } from "./steps";

export interface DemoSeedInput {
  userId: string;
}

export interface DemoSeedResult {
  userId: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Seeds a demo user's fixture rows off the request path. Runs each phase as a
 * separate step so PlanetScale's logical replication doesn't see a single
 * multi-phase burst — this is what was OOMing single-node zero-cache and
 * emitting `Message Processing failed` before manual redeploy was needed.
 *
 * Progress is emitted to the `progress` namespace and consumed by the client
 * via `/api/demo/progress/:runId` (NDJSON). Idempotent: exits with
 * `phase: "skipped"` if the user already has any transaction rows.
 */
export async function demoSeedWorkflow(input: DemoSeedInput): Promise<DemoSeedResult> {
  "use workflow";

  const { userId } = input;
  const emit = (phase: DemoSeedPhase, status: "start" | "done", detail?: Record<string, unknown>) =>
    emitDemoSeedProgressStep({ detail, phase, status, userId });

  try {
    await emit("checking", "start");
    const already = await checkAlreadySeededStep(userId);
    await emit("checking", "done", { already });
    if (already) {
      await emit("skipped", "done");
      await closeDemoSeedProgressStep();
      return { skipped: true, success: true, userId };
    }

    await emit("accounts", "start");
    await seedAccountsStep(userId);
    await emit("accounts", "done");

    await emit("tags", "start");
    await seedTagsStep(userId);
    await emit("tags", "done");

    await emit("transactions", "start");
    const txResult = await seedTransactionsStep(userId);
    await emit("transactions", "done", { inserted: txResult.inserted });

    await emit("holdings", "start");
    await seedHoldingsStep(userId);
    await emit("holdings", "done");

    await emit("snapshots", "start");
    const snapResult = await seedSnapshotsStep(userId);
    await emit("snapshots", "done", { inserted: snapResult.inserted });

    await emit("investments", "start");
    await seedInvestmentActivitiesStep(userId);
    await emit("investments", "done");

    await emit("chats", "start");
    const chatResult = await seedChatThreadsStep(userId);
    await emit("chats", "done", { inserted: chatResult.inserted });

    await emit("done", "done");
    await closeDemoSeedProgressStep();
    return { success: true, userId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await emit("error", "done", { message });
    await closeDemoSeedProgressStep();
    return { error: message, success: false, userId };
  }
}
