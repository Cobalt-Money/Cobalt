import { db } from "@cobalt-web/db";
import type { TagColor } from "@cobalt-web/db/tag-palette";

import type { TagDto } from "./schemas.js";

interface TagRowWithCount {
  archivedAt: Date | null;
  color: string;
  createdAt: Date;
  id: string;
  name: string;
  updatedAt: Date;
  transactionTags: { tagId: string }[];
}

function toDto(row: TagRowWithCount): TagDto {
  return {
    archivedAt: row.archivedAt?.toISOString() ?? null,
    color: row.color as TagColor,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    usageCount: row.transactionTags.length,
  };
}

/** Lists every tag owned by the user (active + archived) with usage counts. */
export async function listTags(userId: string): Promise<TagDto[]> {
  const rows = await db.query.tag.findMany({
    orderBy: { name: "asc" },
    where: { userId: { eq: userId } },
    with: {
      transactionTags: {
        columns: { tagId: true },
      },
    },
  });
  return rows.map(toDto);
}

export async function getTag(userId: string, tagId: string): Promise<TagDto | null> {
  const row = await db.query.tag.findFirst({
    where: { id: { eq: tagId }, userId: { eq: userId } },
    with: { transactionTags: { columns: { tagId: true } } },
  });
  return row ? toDto(row) : null;
}

/** Returns the set of tag ids currently attached to a transaction owned by the user. */
export async function getTagIdsForTransaction(
  userId: string,
  transactionId: string,
): Promise<string[]> {
  const txn = await db.query.transaction.findFirst({
    columns: { id: true },
    where: { id: { eq: transactionId }, userId: { eq: userId } },
  });
  if (!txn) {
    return [];
  }
  const rows = await db.query.transactionTag.findMany({
    columns: { tagId: true },
    where: { transactionId: { eq: transactionId } },
  });
  return rows.map((r) => r.tagId);
}
