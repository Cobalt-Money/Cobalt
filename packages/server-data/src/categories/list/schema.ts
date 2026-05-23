import { z } from "@hono/zod-openapi";

import { categoryGroupResponseSchema, categoryResponseSchema } from "../_shared/schema.js";

export const categoriesResponseSchema = z.object({
  categories: z.array(categoryResponseSchema),
  groups: z.array(categoryGroupResponseSchema),
});

export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;
