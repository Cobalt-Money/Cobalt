import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import {
  categoryGroupNameSchema,
  categoryGroupSelectRefinements,
  categoryIconKeySchema,
  categoryNameSchema,
  categorySelectRefinements,
} from "@cobalt-web/db/schema/accounts/banking/categories/category-zod";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

const categoryRowSchema = createSelectSchema(category, categorySelectRefinements);
const categoryGroupRowSchema = createSelectSchema(categoryGroup, categoryGroupSelectRefinements);

export const categorySchema = categoryRowSchema
  .pick({
    excludeFromInsights: true,
    groupId: true,
    hidden: true,
    iconKey: true,
    id: true,
    name: true,
    order: true,
    systemKey: true,
  })
  .extend({
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("TransactionCategory");

export type CategoryDto = z.infer<typeof categorySchema>;

export const categoryGroupSchema = categoryGroupRowSchema
  .pick({
    id: true,
    name: true,
    order: true,
    systemKey: true,
  })
  .extend({
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("TransactionCategoryGroup");

export type CategoryGroupDto = z.infer<typeof categoryGroupSchema>;

export const categoriesListResponseSchema = z.object({
  categories: z.array(categorySchema),
  groups: z.array(categoryGroupSchema),
});

export const createCategoryBodySchema = z.object({
  excludeFromInsights: z.boolean().optional(),
  groupId: z.uuid(),
  iconKey: categoryIconKeySchema,
  name: categoryNameSchema,
});

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;

export const updateCategoryBodySchema = z
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

export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;

export const hideCategoryBodySchema = z.object({
  /** Reassign all tx + recurring rows to this cat before hiding. Null/omitted = leave assigned. */
  reassignTo: z.uuid().nullable().optional(),
});

export type HideCategoryBody = z.infer<typeof hideCategoryBodySchema>;

export const categoryIdParamSchema = z.object({
  categoryId: z.uuid(),
});

export const reorderCategoriesBodySchema = z.object({
  categoryIds: z.array(z.uuid()).min(1),
  groupId: z.uuid(),
});

export type ReorderCategoriesBody = z.infer<typeof reorderCategoriesBodySchema>;

export const createCategoryGroupBodySchema = z.object({
  name: categoryGroupNameSchema,
});

export type CreateCategoryGroupBody = z.infer<typeof createCategoryGroupBodySchema>;

export const updateCategoryGroupBodySchema = z
  .object({
    name: categoryGroupNameSchema.optional(),
    order: z.number().int().nonnegative().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type UpdateCategoryGroupBody = z.infer<typeof updateCategoryGroupBodySchema>;

export const categoryGroupIdParamSchema = z.object({
  groupId: z.uuid(),
});

export const reorderCategoryGroupsBodySchema = z.object({
  groupIds: z.array(z.uuid()).min(1),
});

export type ReorderCategoryGroupsBody = z.infer<typeof reorderCategoryGroupsBodySchema>;

export const categorySuccessResponse = z.object({ success: z.boolean() });
export const createCategoryResponseSchema = z.object({ category: categorySchema });
export const createCategoryGroupResponseSchema = z.object({ group: categoryGroupSchema });

export { categoryGroupNameSchema, categoryIconKeySchema, categoryNameSchema };
