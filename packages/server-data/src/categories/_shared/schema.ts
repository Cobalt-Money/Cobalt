import { z } from "@hono/zod-openapi";

export const categoryIdSchema = z.object({
  categoryId: z.uuid(),
});

export const categoryGroupIdSchema = z.object({
  groupId: z.uuid(),
});

export const successResponseSchema = z.object({ success: z.boolean() });

export const categoryResponseSchema = z
  .object({
    createdAt: z.string(),
    excludeFromInsights: z.boolean(),
    groupId: z.uuid(),
    hidden: z.boolean(),
    iconKey: z.string(),
    id: z.uuid(),
    name: z.string(),
    order: z.number().int().nonnegative(),
    systemKey: z.string().nullable(),
    updatedAt: z.string(),
  })
  .openapi("Category");

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

export const categoryGroupResponseSchema = z
  .object({
    createdAt: z.string(),
    id: z.uuid(),
    name: z.string(),
    order: z.number().int().nonnegative(),
    systemKey: z.string().nullable(),
    updatedAt: z.string(),
  })
  .openapi("CategoryGroup");

export type CategoryGroupResponse = z.infer<typeof categoryGroupResponseSchema>;
