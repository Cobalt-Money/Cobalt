import { db } from "@cobalt-web/db";
import type {
  AccountResolution,
  PendingAccountCreate,
} from "@cobalt-web/db/schema/imports/import-job";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { eq } from "drizzle-orm";

import { ApiError } from "../../_shared/api-error";
import { assertOwnedJob } from "../shared/queries";
import type { AccountChoice, ConfirmAccountMappingBody } from "../shared/schemas";
import { cacheAccountChoices } from "./cache";

/**
 * Tagged result of resolving an `AccountChoice`. Discriminated by `kind` so
 * callers branch on a tag, not on `typeof` of the value (which is brittle when
 * one shape is a string id and the other an object).
 */
export type ResolvedAccount =
  | { kind: "existing"; accountId: string }
  | { kind: "pendingCreate"; create: PendingAccountCreate };

export async function confirmAccountMapping(
  userId: string,
  jobId: string,
  body: ConfirmAccountMappingBody,
): Promise<void> {
  await assertOwnedJob(userId, jobId);
  let resolution: AccountResolution;
  if (body.kind === "single") {
    const single = await resolveAccountChoice(userId, body.choice);
    resolution =
      single.kind === "existing"
        ? { accountId: single.accountId, kind: "single" }
        : { kind: "single", pendingCreate: single.create };
  } else {
    const rawEntries = Object.entries(body.map);
    // Single batched ownership check for every "existing" target.
    const existingIds = rawEntries.flatMap(([, choice]) =>
      choice.kind === "existing" ? [choice.accountId] : [],
    );
    await assertOwnedAccounts(userId, existingIds);

    const entries = rawEntries.map(([label, choice]) => {
      if (choice.kind === "skip") {
        return [label, "skip" as const] as const;
      }
      if (choice.kind === "existing") {
        return [label, choice.accountId] as const;
      }
      return [label, toPendingCreate(choice)] as const;
    });

    // Write-through cache (one INSERT). Pending creates are cached at commit
    // time by `applyPendingAccountCreates` — their account id only exists then.
    const cacheEntries = rawEntries.flatMap(
      ([label, choice]): { sourceLabel: string; cobaltAccountId: string | null }[] => {
        if (choice.kind === "skip") {
          return [{ cobaltAccountId: null, sourceLabel: label }];
        }
        if (choice.kind === "existing") {
          return [{ cobaltAccountId: choice.accountId, sourceLabel: label }];
        }
        return [];
      },
    );
    await cacheAccountChoices(userId, cacheEntries);

    resolution = { kind: "perLabel", map: Object.fromEntries(entries) };
  }

  await db
    .update(importJob)
    .set({ accountResolution: resolution, status: "account_mapped" })
    .where(eq(importJob.id, jobId));
}

/**
 * Resolve an `AccountChoice` into a tagged result. `existing` carries the
 * confirmed accountId; `create` carries a `PendingAccountCreate` whose
 * `financial_account` row is inserted at commit time so abandoned imports
 * don't leave orphan accounts.
 */
export async function resolveAccountChoice(
  userId: string,
  choice: AccountChoice,
): Promise<ResolvedAccount> {
  if (choice.kind === "skip") {
    throw new ApiError(500, "account_choice_skip_invariant", "resolveAccountChoice called on skip");
  }
  if (choice.kind === "existing") {
    await assertOwnedAccounts(userId, [choice.accountId]);
    return { accountId: choice.accountId, kind: "existing" };
  }
  return { create: toPendingCreate(choice), kind: "pendingCreate" };
}

function toPendingCreate(choice: Extract<AccountChoice, { kind: "create" }>): PendingAccountCreate {
  return {
    institutionLogoDomain: choice.institutionLogoDomain?.trim() || undefined,
    institutionName: choice.institutionName?.trim() || undefined,
    kind: "pendingCreate",
    name: choice.name.trim(),
    subtype: choice.subtype.trim(),
    type: choice.type,
  };
}

/** Single batched ownership check; throws on the first id the user doesn't own. */
async function assertOwnedAccounts(userId: string, accountIds: string[]): Promise<void> {
  if (accountIds.length === 0) {
    return;
  }
  const found = await db.query.financialAccount.findMany({
    columns: { id: true },
    where: { id: { in: accountIds }, userId: { eq: userId } },
  });
  if (found.length === accountIds.length) {
    return;
  }
  const foundSet = new Set(found.map((a) => a.id));
  const missing = accountIds.find((id) => !foundSet.has(id));
  throw new ApiError(409, "account_unowned", `Cannot map to unowned account ${missing}`);
}
