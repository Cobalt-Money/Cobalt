import { db } from "@cobalt-web/db";
import type { CategoryResolution } from "@cobalt-web/db/schema/imports/import-job";
import { importJob } from "@cobalt-web/db/schema/imports/import-job";
import { eq } from "drizzle-orm";

import { assertOwnedJob } from "../shared/queries";
import type { ConfirmCategoryMappingBody } from "../shared/schemas";
import { cacheCategoryChoices } from "./cache";
import { ensureUncategorizedCategory } from "./mutations";

/**
 * Resolve every source-category label to a Cobalt categoryId. `link` points at
 * existing rows; `skip` falls through to the user's "uncategorized" system
 * category, looked up here. Creating new categories during import is not
 * supported — users add categories from settings post-import.
 */
export async function confirmCategoryMapping(
  userId: string,
  jobId: string,
  body: ConfirmCategoryMappingBody,
): Promise<void> {
  await assertOwnedJob(userId, jobId);
  const uncategorizedId = await ensureUncategorizedCategory(userId);

  const entries = Object.entries(body.map);
  const linkTargetIds = entries.flatMap(([, choice]) =>
    choice.action === "link" ? [choice.targetCategoryId] : [],
  );
  await assertOwnedCategories(userId, linkTargetIds);

  const map = Object.fromEntries(
    entries.map(([label, choice]) => [
      label,
      choice.action === "skip" ? uncategorizedId : choice.targetCategoryId,
    ]),
  );

  // Write-through cache (one INSERT) so future imports of these labels reuse the decision.
  await cacheCategoryChoices(
    userId,
    entries.map(([label, choice]) => ({
      choice:
        choice.action === "skip"
          ? { action: "skip", targetCategoryId: null }
          : { action: "link", targetCategoryId: choice.targetCategoryId },
      sourceLabel: label,
    })),
  );
  const resolution: CategoryResolution = { map, pendingCreates: [] };
  await db
    .update(importJob)
    .set({ categoryResolution: resolution, status: "category_mapped" })
    .where(eq(importJob.id, jobId));
}

/** Single batched ownership check; throws on the first id the user doesn't own. */
async function assertOwnedCategories(userId: string, categoryIds: string[]): Promise<void> {
  if (categoryIds.length === 0) {
    return;
  }
  const found = await db.query.category.findMany({
    columns: { id: true },
    where: { id: { in: categoryIds }, userId: { eq: userId } },
  });
  if (found.length === categoryIds.length) {
    return;
  }
  const foundSet = new Set(found.map((c) => c.id));
  const missing = categoryIds.find((id) => !foundSet.has(id));
  throw new Error(`Cannot map to unowned category ${missing}`);
}
