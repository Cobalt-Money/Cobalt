import { z } from "@hono/zod-openapi";

export const reorderCategoriesSchema = z.object({
  categoryIds: z.array(z.uuid()).min(1),
  groupId: z.uuid(),
});

export type ReorderCategories = z.infer<typeof reorderCategoriesSchema>;
