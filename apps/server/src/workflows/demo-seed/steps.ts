import {
  hasAnyDemoTransactions,
  seedDemoAccountsAndBalances,
  seedDemoChatThreads,
  seedDemoHoldings,
  seedDemoInvestmentActivities,
  seedDemoSnapshots,
  seedDemoTags,
  seedDemoTransactions,
} from "@cobalt-web/db/demo/seed-demo-user";
import { getWritable } from "workflow";

export type DemoSeedPhase =
  | "checking"
  | "accounts"
  | "tags"
  | "transactions"
  | "holdings"
  | "snapshots"
  | "investments"
  | "chats"
  | "done"
  | "skipped"
  | "error";

export interface DemoSeedProgress {
  phase: DemoSeedPhase;
  status: "start" | "done";
  userId: string;
  detail?: Record<string, unknown>;
  at: number;
}

export async function emitDemoSeedProgressStep(event: Omit<DemoSeedProgress, "at">) {
  "use step";
  const writer = getWritable<DemoSeedProgress>({ namespace: "progress" }).getWriter();
  try {
    await writer.write({ ...event, at: Date.now() });
  } finally {
    writer.releaseLock();
  }
}

export async function closeDemoSeedProgressStep() {
  "use step";
  await getWritable<DemoSeedProgress>({ namespace: "progress" }).close();
}

export async function checkAlreadySeededStep(userId: string): Promise<boolean> {
  "use step";
  return await hasAnyDemoTransactions(userId);
}

export async function seedAccountsStep(userId: string): Promise<void> {
  "use step";
  await seedDemoAccountsAndBalances(userId);
}

export async function seedTagsStep(userId: string): Promise<void> {
  "use step";
  await seedDemoTags(userId);
}

export async function seedTransactionsStep(userId: string): Promise<{ inserted: number }> {
  "use step";
  return await seedDemoTransactions(userId);
}

export async function seedHoldingsStep(userId: string): Promise<void> {
  "use step";
  await seedDemoHoldings(userId);
}

export async function seedSnapshotsStep(userId: string): Promise<{ inserted: number }> {
  "use step";
  return await seedDemoSnapshots(userId);
}

export async function seedInvestmentActivitiesStep(userId: string): Promise<void> {
  "use step";
  await seedDemoInvestmentActivities(userId);
}

export async function seedChatThreadsStep(userId: string): Promise<{ inserted: number }> {
  "use step";
  return await seedDemoChatThreads(userId);
}
