import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import type { AccountResolution } from "@cobalt-web/db/schema/imports/import-job";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { eq } from "drizzle-orm";

import { assertOwnedJob } from "../shared/queries";
import type { AccountChoice, ConfirmAccountMappingBody } from "../shared/schemas";

export async function confirmAccountMapping(
  userId: string,
  jobId: string,
  body: ConfirmAccountMappingBody,
): Promise<void> {
  await assertOwnedJob(userId, jobId);
  const resolution: AccountResolution =
    body.kind === "single"
      ? { accountId: await resolveAccountChoice(userId, body.choice), kind: "single" }
      : {
          kind: "perLabel",
          map: Object.fromEntries(
            await Promise.all(
              Object.entries(body.map).map(async ([label, choice]) => {
                if (choice.kind === "skip") {
                  return [label, "skip"] as const;
                }
                return [label, await resolveAccountChoice(userId, choice)] as const;
              }),
            ),
          ),
        };

  await db
    .update(importJob)
    .set({ accountResolution: resolution, status: "account_mapped" })
    .where(eq(importJob.id, jobId));
}

async function resolveAccountChoice(userId: string, choice: AccountChoice): Promise<string> {
  if (choice.kind === "skip") {
    throw new Error("resolveAccountChoice called on skip");
  }
  if (choice.kind === "existing") {
    const owned = await db.query.financialAccount.findFirst({
      columns: { id: true },
      where: { id: { eq: choice.accountId }, userId: { eq: userId } },
    });
    if (!owned) {
      throw new Error(`Cannot map to unowned account ${choice.accountId}`);
    }
    return owned.id;
  }
  return await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(financialAccount)
      .values({
        name: choice.name.trim(),
        source: "manual",
        subtype: choice.subtype.trim(),
        type: choice.type,
        userId,
      })
      .returning({ id: financialAccount.id });
    if (!created) {
      throw new Error("Failed to create account");
    }
    await tx.insert(balance).values({
      accountId: created.id,
      currency: "USD",
      current: "0",
      userId,
    });
    return created.id;
  });
}
