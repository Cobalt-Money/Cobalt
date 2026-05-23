import {
  categoryIconKeySchema,
  categoryNameSchema,
} from "@cobalt-web/db/schema/accounts/banking/categories/category-zod";
import { z } from "@hono/zod-openapi";

export const patchCategorySchema = z
  .object({
    excludeFromInsights: z.boolean().optional(),
    groupId: z.uuid().optional(),
    hidden: z.boolean().optional(),
    iconKey: categoryIconKeySchema.optional(),
    name: categoryNameSchema.optional(),
    order: z.number().int().nonnegative().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type PatchCategory = z.infer<typeof patchCategorySchema>;
