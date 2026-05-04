import { tag } from "@cobalt-web/db/schema/accounts/banking/tags/tag";
import {
  tagColorSchema,
  tagNameSchema,
  tagSelectRefinements,
} from "@cobalt-web/db/schema/accounts/banking/tags/tag-zod";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

/** Drizzle-derived row schema for the `tag` table — full select shape. */
const tagRowSchema = createSelectSchema(tag, tagSelectRefinements);

/** Public tag DTO: row columns + computed `usageCount`, dates serialised to ISO strings. */
export const tagSchema = tagRowSchema
  .pick({
    color: true,
    id: true,
    name: true,
  })
  .extend({
    archivedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    usageCount: z.number().int().nonnegative(),
  });

export type TagDto = z.infer<typeof tagSchema>;

export const tagsListResponseSchema = z.object({
  tags: z.array(tagSchema),
});

/** Body for `POST /tags` — pick of insert columns the user owns. */
export const createTagBodySchema = tagRowSchema.pick({
  color: true,
  name: true,
});

export type CreateTagBody = z.infer<typeof createTagBodySchema>;

export const updateTagBodySchema = z
  .object({
    archived: z.boolean().optional(),
    color: tagColorSchema.optional(),
    name: tagNameSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type UpdateTagBody = z.infer<typeof updateTagBodySchema>;

export const tagIdParamSchema = z.object({
  tagId: z.uuid(),
});

export const bulkApplyTagsBodySchema = z
  .object({
    addTagIds: z.array(z.uuid()).default([]),
    removeTagIds: z.array(z.uuid()).default([]),
    transactionIds: z.array(z.uuid()).min(1),
  })
  .refine((v) => v.addTagIds.length > 0 || v.removeTagIds.length > 0, {
    message: "At least one of addTagIds or removeTagIds must be non-empty",
  });

export type BulkApplyTagsBody = z.infer<typeof bulkApplyTagsBodySchema>;

export const tagSuccessResponse = z.object({ success: z.boolean() });

export const createTagResponseSchema = z.object({ tag: tagSchema });

export { tagColorSchema, tagNameSchema };
