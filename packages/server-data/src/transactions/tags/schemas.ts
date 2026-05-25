import { tag } from "@cobalt-web/db/schema/accounts/banking/tags/tag";
import {
  tagColorSchema as baseTagColorSchema,
  tagNameSchema,
} from "@cobalt-web/db/schema/accounts/banking/tags/tag-zod";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

/** Named version of the tag-color enum so OpenAPI emits a single `TagColor` schema. */
const tagColorSchema = baseTagColorSchema.openapi("TagColor");

/** Drizzle-derived row schema for the `tag` table — Date columns coerced to ISO strings on the wire. */
const tagRowSchema = createSelectSchema(tag, {
  archivedAt: z.string().nullable(),
  color: tagColorSchema,
  createdAt: z.string(),
  name: tagNameSchema,
  updatedAt: z.string(),
});

/** Bare tag row (no usage count). Returned by `getTagsForTransaction`. */
export const tagSchema = tagRowSchema.omit({ userId: true }).openapi("Tag");

export type Tag = z.infer<typeof tagSchema>;

/** Tag row + computed `usageCount`. Returned by `listTags` (tag library page). */
export const tagWithUsageSchema = tagSchema
  .extend({ usageCount: z.number().int().nonnegative() })
  .openapi("TagWithUsage");

export type TagWithUsage = z.infer<typeof tagWithUsageSchema>;

export const tagsListResponseSchema = z
  .object({
    tags: z.array(tagWithUsageSchema),
  })
  .openapi("TagsResponse");

/** Response for `GET /transactions/{id}/tags` — bare tag rows, no usage count. */
export const transactionTagsResponseSchema = z
  .object({
    tags: z.array(tagSchema),
  })
  .openapi("TransactionTagsResponse");

/** Body for `POST /tags` — pick of insert columns the user owns. */
export const createTagSchema = tagRowSchema.pick({
  color: true,
  name: true,
});

export type CreateTag = z.infer<typeof createTagSchema>;

export const patchTagSchema = z
  .object({
    archived: z.boolean().optional(),
    color: tagColorSchema.optional(),
    name: tagNameSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type PatchTag = z.infer<typeof patchTagSchema>;

export const tagIdSchema = z.object({
  tagId: z.uuid(),
});

export const bulkApplyTagsSchema = z
  .object({
    addTagIds: z.array(z.uuid()).default([]),
    removeTagIds: z.array(z.uuid()).default([]),
    transactionIds: z.array(z.uuid()).min(1),
  })
  .refine((v) => v.addTagIds.length > 0 || v.removeTagIds.length > 0, {
    message: "At least one of addTagIds or removeTagIds must be non-empty",
  });

export type BulkApplyTags = z.infer<typeof bulkApplyTagsSchema>;

export const createTagResponseSchema = z.object({ tag: tagWithUsageSchema });

export { tagColorSchema, tagNameSchema };
