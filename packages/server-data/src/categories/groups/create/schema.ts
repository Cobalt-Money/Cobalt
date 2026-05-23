import { categoryGroupNameSchema } from "@cobalt-web/db/schema/accounts/banking/categories/category-zod";
import { z } from "@hono/zod-openapi";

export const createCategoryGroupSchema = z.object({
  name: categoryGroupNameSchema,
});

export type CreateCategoryGroup = z.infer<typeof createCategoryGroupSchema>;
