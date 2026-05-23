import {
  categoryIconKeySchema,
  categoryNameSchema,
} from "@cobalt-web/db/schema/accounts/banking/categories/category-zod";
import { z } from "@hono/zod-openapi";

export const createCategorySchema = z.object({
  excludeFromInsights: z.boolean().optional(),
  groupId: z.uuid(),
  iconKey: categoryIconKeySchema,
  name: categoryNameSchema,
});

export type CreateCategory = z.infer<typeof createCategorySchema>;
