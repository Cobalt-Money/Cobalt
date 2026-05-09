import { db } from "@cobalt-web/db";
import type { CategoryResolution } from "@cobalt-web/db/schema/imports/import-job";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { eq } from "drizzle-orm";

import { assertOwnedJob } from "../shared/queries";
import type { ConfirmCategoryMappingBody } from "../shared/schemas";
import { ensureUncategorizedCategory } from "./mutations";

/**
 * Resolve every source-category label to a Cobalt categoryId. `link`/`linkRename`
 * point at existing rows; `create` rows are deferred to the commit workflow's
 * `applyCreatesStep` (single transaction with the bulk insert). `skip` falls
 * through to the user's "uncategorized" system category, looked up here.
 */
export async function confirmCategoryMapping(
  userId: string,
  jobId: string,
  body: ConfirmCategoryMappingBody,
): Promise<void> {
  await assertOwnedJob(userId, jobId);
  const uncategorizedId = await ensureUncategorizedCategory(userId);

  const map: Record<string, string> = {};
  const pendingCreates: CategoryResolution["pendingCreates"] = [];
  const pendingRenames: CategoryResolution["pendingRenames"] = [];

  for (const [label, choice] of Object.entries(body.map)) {
    if (choice.action === "skip") {
      map[label] = uncategorizedId;
      continue;
    }
    if (choice.action === "link") {
      await assertOwnedCategory(userId, choice.targetCategoryId);
      map[label] = choice.targetCategoryId;
      continue;
    }
    if (choice.action === "linkRename") {
      await assertOwnedCategory(userId, choice.targetCategoryId);
      map[label] = choice.targetCategoryId;
      pendingRenames.push({ categoryId: choice.targetCategoryId, newName: choice.newName });
      continue;
    }
    // create — deferred. Use the source label as a placeholder map value;
    // applyCreatesStep replaces it with the real id at commit time.
    map[label] = `__pending:${label}`;
    pendingCreates.push({
      color: choice.color,
      iconKey: choice.iconKey,
      name: choice.name,
      sourceLabel: label,
    });
  }

  const resolution: CategoryResolution = { map, pendingCreates, pendingRenames };
  await db
    .update(importJob)
    .set({ categoryResolution: resolution, status: "category_mapped" })
    .where(eq(importJob.id, jobId));
}

async function assertOwnedCategory(userId: string, categoryId: string): Promise<void> {
  const c = await db.query.category.findFirst({
    columns: { id: true },
    where: { id: { eq: categoryId }, userId: { eq: userId } },
  });
  if (!c) {
    throw new Error(`Cannot map to unowned category ${categoryId}`);
  }
}
