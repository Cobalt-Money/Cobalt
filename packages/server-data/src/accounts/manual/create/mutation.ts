import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";

import { isLiabilityType } from "../../../providers/plaid/link/lib.js";
import { upsertAllBalanceSnapshots } from "../../../snapshots/mutations.js";
import type { CreateManualAccount } from "./schema.js";

/**
 * Insert a manual financial account + its initial balance row, mirroring the
 * Zero `m.accounts.createAccount` mutator so the OAuth / SDK path and the
 * web-session path produce identical rows. Also seeds today's snapshot so the
 * new account shows up in net-worth views immediately (Plaid/SnapTrade get
 * this through their sync workflows; manual creates need it inline).
 *
 * Returns the new account id.
 */
export async function createManualAccount(
  userId: string,
  body: CreateManualAccount,
): Promise<{ id: string }> {
  const trimmedLogo = body.logoDomain?.trim();
  const [created] = await db
    .insert(financialAccount)
    .values({
      logoDomain: trimmedLogo && trimmedLogo.length > 0 ? trimmedLogo : null,
      name: body.name.trim(),
      source: "manual",
      subtype: body.subtype.trim(),
      type: body.type,
      userId,
    })
    .returning({ id: financialAccount.id });
  if (!created) {
    throw new Error("Failed to create manual account");
  }
  const accountId = created.id;
  // Canonical sign convention: liabilities stored negative. UI collects
  // positive magnitudes ("$500 owed"); flip here.
  const liability = isLiabilityType(body.type);
  const signedCurrent = liability ? -body.currentBalance : body.currentBalance;
  const signedCreditLimit =
    body.type === "credit" && body.creditLimit !== undefined
      ? (-body.creditLimit).toString()
      : null;
  await db.insert(balance).values({
    accountId,
    creditLimit: signedCreditLimit,
    currency: body.currency,
    current: signedCurrent.toString(),
    userId,
  });
  await upsertAllBalanceSnapshots(userId, "manual-create");
  return { id: accountId };
}
