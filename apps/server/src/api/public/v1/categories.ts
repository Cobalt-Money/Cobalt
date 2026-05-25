import { getCategories } from "@cobalt-web/server-data/categories/list";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireApiKey } from "./middleware/require-api-key.js";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas.public";
import { categoryGroupSchema, categorySchema } from "./schemas.js";

const categoriesResponseSchema = z
  .object({
    data: z.object({
      categories: z.array(categorySchema),
      groups: z.array(categoryGroupSchema),
    }),
  })
  .openapi("CategoryList");

const route = createRoute({
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

export const categoriesRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const result = await getCategories(user.id);
  return c.json(
    {
      data: {
        categories: z.array(categorySchema).parse(result.categories),
        groups: z.array(categoryGroupSchema).parse(result.groups),
      },
    },
    200,
  );
});
