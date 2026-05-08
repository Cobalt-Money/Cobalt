import {
  CategoryMutationError,
  createCategory,
  createCategoryGroup,
  deleteCategory,
  deleteCategoryGroup,
  hideCategory,
  reorderCategories,
  reorderCategoryGroups,
  updateCategory,
  updateCategoryGroup,
} from "@cobalt-web/server-data/transactions/categories/mutations";
import {
  getCategory,
  getCategoryGroup,
  listCategories,
} from "@cobalt-web/server-data/transactions/categories/queries";
import {
  categoriesListResponseSchema,
  categoryGroupIdParamSchema,
  categoryIdParamSchema,
  categorySuccessResponse,
  createCategoryBodySchema,
  createCategoryGroupBodySchema,
  createCategoryGroupResponseSchema,
  createCategoryResponseSchema,
  hideCategoryBodySchema,
  reorderCategoriesBodySchema,
  reorderCategoryGroupsBodySchema,
  updateCategoryBodySchema,
  updateCategoryGroupBodySchema,
} from "@cobalt-web/server-data/transactions/categories/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const errorResponseSchema = z.object({ code: z.string(), error: z.string() });

const TAGS = ["Categories"] as const;

const listCategoriesRoute = createRoute({
  description: "Lists every active category and group owned by the user.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  responses: {
    200: {
      content: { "application/json": { schema: categoriesListResponseSchema } },
      description: "User's categories + groups",
    },
  },
  summary: "List categories",
  tags: [...TAGS],
});

const createCategoryRoute = createRoute({
  description: "Creates a custom category under an existing group.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: {
    body: {
      content: { "application/json": { schema: createCategoryBodySchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: createCategoryResponseSchema } },
      description: "Category created",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Group not found",
    },
  },
  summary: "Create category",
  tags: [...TAGS],
});

const updateCategoryRoute = createRoute({
  description: "Renames, recolors/icons, hides, reorders, or moves a category between groups.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/{categoryId}",
  request: {
    body: {
      content: { "application/json": { schema: updateCategoryBodySchema } },
    },
    params: categoryIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: categorySuccessResponse } },
      description: "Category updated",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Category or group not found",
    },
  },
  summary: "Update category",
  tags: [...TAGS],
});

const deleteCategoryRoute = createRoute({
  description:
    "Soft-deletes a custom category. Reassigns all dependent transactions and recurring rows to the user's Uncategorized seed cat. System cats cannot be deleted (only hidden).",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{categoryId}",
  request: { params: categoryIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: categorySuccessResponse } },
      description: "Category deleted",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Category not found",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "System category cannot be deleted",
    },
  },
  summary: "Delete category",
  tags: [...TAGS],
});

const hideCategoryRoute = createRoute({
  description:
    "Hides a category. Optionally reassigns dependent transactions and recurring rows to a target cat first; otherwise leaves them assigned to the now-hidden cat.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/{categoryId}/hide",
  request: {
    body: { content: { "application/json": { schema: hideCategoryBodySchema } } },
    params: categoryIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: categorySuccessResponse } },
      description: "Category hidden",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Category or reassign target not found",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Reassign target invalid",
    },
  },
  summary: "Hide category",
  tags: [...TAGS],
});

const reorderCategoriesRoute = createRoute({
  description: "Replaces the order of categories within a single group.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/reorder",
  request: {
    body: {
      content: { "application/json": { schema: reorderCategoriesBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: categorySuccessResponse } },
      description: "Reordered",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Group not found",
    },
  },
  summary: "Reorder categories",
  tags: [...TAGS],
});

const createGroupRoute = createRoute({
  description: "Creates a custom category group.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/groups",
  request: {
    body: {
      content: {
        "application/json": { schema: createCategoryGroupBodySchema },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: createCategoryGroupResponseSchema },
      },
      description: "Group created",
    },
  },
  summary: "Create category group",
  tags: [...TAGS],
});

const updateGroupRoute = createRoute({
  description: "Renames or reorders a category group.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/groups/{groupId}",
  request: {
    body: {
      content: {
        "application/json": { schema: updateCategoryGroupBodySchema },
      },
    },
    params: categoryGroupIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: categorySuccessResponse } },
      description: "Group updated",
    },
  },
  summary: "Update category group",
  tags: [...TAGS],
});

const deleteGroupRoute = createRoute({
  description:
    "Soft-deletes a custom group. The group must be empty (no active categories). System groups cannot be deleted.",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/groups/{groupId}",
  request: { params: categoryGroupIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: categorySuccessResponse } },
      description: "Group deleted",
    },
    404: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Group not found",
    },
    409: {
      content: { "application/json": { schema: errorResponseSchema } },
      description: "Group has categories or is system-locked",
    },
  },
  summary: "Delete category group",
  tags: [...TAGS],
});

const reorderGroupsRoute = createRoute({
  description: "Replaces the order of all groups for the user.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/groups/reorder",
  request: {
    body: {
      content: {
        "application/json": { schema: reorderCategoryGroupsBodySchema },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: categorySuccessResponse } },
      description: "Reordered",
    },
  },
  summary: "Reorder category groups",
  tags: [...TAGS],
});

const NOT_FOUND_CODES: ReadonlySet<CategoryMutationError["code"]> = new Set([
  "not_found",
  "group_not_found",
  "uncategorized_missing",
]);

export const categoriesRouter = new OpenAPIHono<AppEnv>()
  .openapi(listCategoriesRoute, async (c) => {
    const data = await listCategories(c.var.user.id);
    return c.json(data, 200);
  })
  .openapi(createCategoryRoute, async (c) => {
    const body = c.req.valid("json");
    try {
      const { id } = await createCategory(c.var.user.id, body);
      const created = await getCategory(c.var.user.id, id);
      if (!created) {
        throw new Error("Category created but not found");
      }
      return c.json({ category: created }, 201);
    } catch (error) {
      if (error instanceof CategoryMutationError) {
        return c.json({ code: error.code, error: error.message }, 404);
      }
      throw error;
    }
  })
  .openapi(updateCategoryRoute, async (c) => {
    const { categoryId } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      await updateCategory(c.var.user.id, categoryId, body);
      return c.json({ success: true }, 200);
    } catch (error) {
      if (error instanceof CategoryMutationError) {
        return c.json({ code: error.code, error: error.message }, 404);
      }
      throw error;
    }
  })
  .openapi(deleteCategoryRoute, async (c) => {
    const { categoryId } = c.req.valid("param");
    try {
      await deleteCategory(c.var.user.id, categoryId);
      return c.json({ success: true }, 200);
    } catch (error) {
      if (error instanceof CategoryMutationError) {
        if (NOT_FOUND_CODES.has(error.code)) {
          return c.json({ code: error.code, error: error.message }, 404);
        }
        return c.json({ code: error.code, error: error.message }, 409);
      }
      throw error;
    }
  })
  .openapi(hideCategoryRoute, async (c) => {
    const { categoryId } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      await hideCategory(c.var.user.id, categoryId, body);
      return c.json({ success: true }, 200);
    } catch (error) {
      if (error instanceof CategoryMutationError) {
        if (NOT_FOUND_CODES.has(error.code)) {
          return c.json({ code: error.code, error: error.message }, 404);
        }
        return c.json({ code: error.code, error: error.message }, 409);
      }
      throw error;
    }
  })
  .openapi(reorderCategoriesRoute, async (c) => {
    const body = c.req.valid("json");
    try {
      await reorderCategories(c.var.user.id, body);
      return c.json({ success: true }, 200);
    } catch (error) {
      if (error instanceof CategoryMutationError) {
        return c.json({ code: error.code, error: error.message }, 404);
      }
      throw error;
    }
  })
  .openapi(createGroupRoute, async (c) => {
    const body = c.req.valid("json");
    const { id } = await createCategoryGroup(c.var.user.id, body);
    const created = await getCategoryGroup(c.var.user.id, id);
    if (!created) {
      throw new Error("Group created but not found");
    }
    return c.json({ group: created }, 201);
  })
  .openapi(updateGroupRoute, async (c) => {
    const { groupId } = c.req.valid("param");
    const body = c.req.valid("json");
    await updateCategoryGroup(c.var.user.id, groupId, body);
    return c.json({ success: true }, 200);
  })
  .openapi(deleteGroupRoute, async (c) => {
    const { groupId } = c.req.valid("param");
    try {
      await deleteCategoryGroup(c.var.user.id, groupId);
      return c.json({ success: true }, 200);
    } catch (error) {
      if (error instanceof CategoryMutationError) {
        if (NOT_FOUND_CODES.has(error.code)) {
          return c.json({ code: error.code, error: error.message }, 404);
        }
        return c.json({ code: error.code, error: error.message }, 409);
      }
      throw error;
    }
  })
  .openapi(reorderGroupsRoute, async (c) => {
    const body = c.req.valid("json");
    await reorderCategoryGroups(c.var.user.id, body);
    return c.json({ success: true }, 200);
  });
