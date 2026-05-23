import { categoryGroupNameSchema } from "@cobalt-web/db/schema/accounts/banking/categories/category-zod";
import { z } from "@hono/zod-openapi";

export const patchCategoryGroupSchema = z
  .object({
    name: categoryGroupNameSchema.optional(),
    order: z.number().int().nonnegative().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type PatchCategoryGroup = z.infer<typeof patchCategoryGroupSchema>;
