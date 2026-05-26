import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  CategoryMutationError,
  categoryIdSchema,
} from "@cobalt-web/server-data/categories/_shared";
import { createCategory, createCategorySchema } from "@cobalt-web/server-data/categories/create";
import { deleteCategory } from "@cobalt-web/server-data/categories/delete";
import { getCategoryDetail } from "@cobalt-web/server-data/categories/detail";
import { getCategories } from "@cobalt-web/server-data/categories/list";
import { patchCategory, patchCategorySchema } from "@cobalt-web/server-data/categories/patch";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../lib/openapi-helpers.js";
import { requireApiKey } from "./middleware/require-api-key.js";
import { categoryGroupSchema, categorySchema } from "./schemas.js";

const categoriesResponseSchema = z
  .object({
    categories: z.array(categorySchema),
    groups: z.array(categoryGroupSchema),
  })
  .openapi("CategoryList");

const categoryDetailResponseSchema = categorySchema.openapi("CategoryDetailResponse");

const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  "not_found",
  "group_not_found",
  "uncategorized_missing",
]);

const listRoute = createRoute({
  description:
    "Returns the spending category taxonomy for the user — both system-seeded categories and user-created ones.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "categories_list",
  path: "/categories",
  responses: {
    200: jsonContent(categoriesResponseSchema, "Categories + groups"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List categories",
  tags: ["Categories"],
});

const createRoute_ = createRoute({
  description: "Create a custom category under an existing group.",
  method: "post",
  middleware: [requireApiKey] as const,
  operationId: "categories_create",
  path: "/categories",
  request: { body: jsonContentRequired(createCategorySchema, "Category to create") },
  responses: {
    201: jsonContent(categoryDetailResponseSchema, "Created category"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Group not found"),
    422: validationErrorResponse(createCategorySchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Create category",
  tags: ["Categories"],
});

const patchRoute = createRoute({
  description: "Rename, recolor, hide, reorder, or move a category between groups.",
  method: "patch",
  middleware: [requireApiKey] as const,
  operationId: "categories_update",
  path: "/categories/{categoryId}",
  request: {
    body: jsonContentRequired(patchCategorySchema, "Fields to update"),
    params: categoryIdSchema,
  },
  responses: {
    200: jsonContent(categoryDetailResponseSchema, "Updated category"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Category or group not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Operation not permitted on this category"),
    422: validationErrorResponse(patchCategorySchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Update category",
  tags: ["Categories"],
});

const deleteRoute = createRoute({
  description:
    "Soft-delete a custom category. Dependent transactions and recurring rows are reassigned to the user's Uncategorized seed category. System categories cannot be deleted — hide them instead.",
  method: "delete",
  middleware: [requireApiKey] as const,
  operationId: "categories_delete",
  path: "/categories/{categoryId}",
  request: { params: categoryIdSchema },
  responses: {
    204: { description: "Category deleted" },
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Category not found"),
    409: jsonContent(errorResponseWithCodeSchema, "System category cannot be deleted"),
    422: validationErrorResponse(categoryIdSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Delete category",
  tags: ["Categories"],
});

function categoryErrorResponse(
  error: unknown,
): { status: 404 | 409; body: { code: string; error: string } } | null {
  if (error instanceof CategoryMutationError) {
    const status = NOT_FOUND_CODES.has(error.code) ? 404 : 409;
    return { body: { code: error.code, error: error.message }, status };
  }
  if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
    return { body: { code: error.code, error: error.message }, status: error.status };
  }
  return null;
}

export const categoriesRouter = createApp()
  .openapi(listRoute, async (c) => {
    const { user } = c.var;
    const result = await getCategories(user.id);
    return c.json(
      {
        categories: z.array(categorySchema).parse(result.categories),
        groups: z.array(categoryGroupSchema).parse(result.groups),
      },
      200,
    );
  })
  .openapi(createRoute_, async (c) => {
    const { user } = c.var;
    const body = c.req.valid("json");
    try {
      const { id } = await createCategory(user.id, body);
      const created = await getCategoryDetail(user.id, id);
      return c.json(categorySchema.parse(created), 201);
    } catch (error) {
      const mapped = categoryErrorResponse(error);
      if (mapped?.status === 404) {
        return c.json(mapped.body, 404);
      }
      throw error;
    }
  })
  .openapi(patchRoute, async (c) => {
    const { user } = c.var;
    const { categoryId } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      await patchCategory(user.id, categoryId, body);
      const updated = await getCategoryDetail(user.id, categoryId);
      return c.json(categorySchema.parse(updated), 200);
    } catch (error) {
      const mapped = categoryErrorResponse(error);
      if (mapped?.status === 404) {
        return c.json(mapped.body, 404);
      }
      if (mapped?.status === 409) {
        return c.json(mapped.body, 409);
      }
      throw error;
    }
  })
  .openapi(deleteRoute, async (c) => {
    const { user } = c.var;
    const { categoryId } = c.req.valid("param");
    try {
      await deleteCategory(user.id, categoryId);
      return c.body(null, 204);
    } catch (error) {
      const mapped = categoryErrorResponse(error);
      if (mapped?.status === 404) {
        return c.json(mapped.body, 404);
      }
      if (mapped?.status === 409) {
        return c.json(mapped.body, 409);
      }
      throw error;
    }
  });
