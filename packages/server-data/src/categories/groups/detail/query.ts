import { db } from "@cobalt-web/db";

import { ApiError } from "../../_shared/errors.js";
import { toCategoryGroupDto } from "../../_shared/map.js";
import type { CategoryGroupResponse } from "../../_shared/schema.js";

export async function getCategoryGroupDetail(
  userId: string,
  groupId: string,
): Promise<CategoryGroupResponse> {
  const row = await db.query.categoryGroup.findFirst({
    where: {
      deletedAt: { isNull: true },
      id: { eq: groupId },
      userId: { eq: userId },
    },
  });
  if (!row) {
    throw new ApiError(404, "group_not_found", "Group not found");
  }
  return toCategoryGroupDto(row);
}
