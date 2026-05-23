import { z } from "@hono/zod-openapi";

export const reorderCategoryGroupsSchema = z.object({
  groupIds: z.array(z.uuid()).min(1),
});

export type ReorderCategoryGroups = z.infer<typeof reorderCategoryGroupsSchema>;
