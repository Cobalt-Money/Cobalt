import { db } from "@cobalt-web/db";
import type { TagColor } from "@cobalt-web/db/tag-palette";

import { ApiError } from "../errors.js";
import type { Tag, TagWithUsage } from "./schemas.js";

type TagRow = Awaited<ReturnType<typeof db.query.tag.findFirst>>;
type TagRowWithCount = Awaited<
  ReturnType<
    typeof db.query.tag.findMany<{
      with: { transactionTags: { columns: { tagId: true } } };
    }>
  >
>[number];

function toTag(row: NonNullable<TagRow>): Tag {
  return {
    archivedAt: row.archivedAt?.toISOString() ?? null,
    color: row.color as TagColor,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toTagWithUsage(row: TagRowWithCount): TagWithUsage {
  return { ...toTag(row), usageCount: row.transactionTags.length };
}

/** Lists every tag owned by the user (active + archived) with usage counts. */
export async function listTags(userId: string): Promise<TagWithUsage[]> {
  const rows = await db.query.tag.findMany({
    orderBy: { name: "asc" },
    where: { userId: { eq: userId } },
    with: {
      transactionTags: {
        columns: { tagId: true },
      },
    },
  });
  return rows.map(toTagWithUsage);
}

export async function getTag(userId: string, tagId: string): Promise<TagWithUsage | null> {
  const row = await db.query.tag.findFirst({
    where: { id: { eq: tagId }, userId: { eq: userId } },
    with: { transactionTags: { columns: { tagId: true } } },
  });
  return row ? toTagWithUsage(row) : null;
}

/** Returns bare tag rows (no usage count) for every tag attached to a transaction owned by the user. */
export async function getTagsForTransaction(userId: string, transactionId: string): Promise<Tag[]> {
  const txn = await db.query.transaction.findFirst({
    columns: {},
    where: { id: { eq: transactionId }, userId: { eq: userId } },
    with: {
      transactionTags: {
        columns: {},
        with: {
          tag: true,
        },
      },
    },
  });
  if (!txn) {
    throw new ApiError(404, "transaction_not_found", "Transaction not found");
  }
  return txn.transactionTags.map((jt) => toTag(jt.tag));
}
