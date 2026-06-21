#!/usr/bin/env bun
/**
 * One-shot: backfill `social_post` for every user with at least one Plaid
 * connection. Applies each user's `social_share_settings` (or defaults if
 * absent) and inserts a post row per qualifying transaction (in-store +
 * lat/lon present). Idempotent — ON CONFLICT DO NOTHING on (user_id, txn_id).
 *
 * Usage:
 *   bun run apps/server/scripts/backfill-social-posts.ts          # dry-run all
 *   USER_ID=xxx bun run apps/server/scripts/backfill-social-posts.ts
 *   bun run apps/server/scripts/backfill-social-posts.ts --apply  # insert + patch
 *   bun run apps/server/scripts/backfill-social-posts.ts --refresh # patch only
 */

import { resolve } from "node:path";

import { config } from "dotenv";

config({ path: resolve(import.meta.dir, "../.env"), quiet: true });

const APPLY = process.argv.includes("--apply");
const REFRESH_ONLY = process.argv.includes("--refresh");
const { USER_ID } = process.env;

const { autoShareInStoreTxnsForUser, refreshSocialPostProjectionsForUser } =
  await import("@cobalt-web/server-data/social");
const { getUserIdsWithConnectedAccounts } = await import("@cobalt-web/server-data/user");

const userIds = USER_ID ? [USER_ID] : await getUserIdsWithConnectedAccounts();

let mode = "dry-run";
if (REFRESH_ONLY) {
  mode = "refresh";
} else if (APPLY) {
  mode = "apply";
}
console.log(`[backfill-social-posts] mode=${mode} users=${userIds.length}`);

let totalInserted = 0;
let totalScanned = 0;
let totalPatched = 0;
let failedUsers = 0;

for (const userId of userIds) {
  if (!(APPLY || REFRESH_ONLY)) {
    console.log(`  ${userId}: would scan (dry-run)`);
    continue;
  }
  try {
    if (REFRESH_ONLY) {
      const { patched } = await refreshSocialPostProjectionsForUser(userId);
      totalPatched += patched;
      console.log(`  ${userId}: patched=${patched}`);
      continue;
    }
    const { inserted, scanned, patched } = await autoShareInStoreTxnsForUser(userId);
    totalInserted += inserted;
    totalScanned += scanned;
    totalPatched += patched;
    console.log(`  ${userId}: scanned=${scanned} inserted=${inserted} patched=${patched}`);
  } catch (error) {
    console.error(`  ${userId}: FAILED`, error);
    failedUsers += 1;
  }
}

console.log(
  `[backfill-social-posts] done. scanned=${totalScanned} inserted=${totalInserted} patched=${totalPatched} failed=${failedUsers}`,
);
process.exit(failedUsers > 0 ? 1 : 0);
