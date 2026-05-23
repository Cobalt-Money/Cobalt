import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { categoriesResponseSchema, getCategories } from "@cobalt-web/server-data/categories/list";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Lists every active category and group owned by the user.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  responses: {
    200: jsonContent(categoriesResponseSchema, "User's categories + groups"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "List categories",
  tags: ["Categories"],
});

export const listRouter = createApp().openapi(route, async (c) => {
  const data = await getCategories(c.var.user.id);
  return c.json(categoriesResponseSchema.parse(data), 200);
});
