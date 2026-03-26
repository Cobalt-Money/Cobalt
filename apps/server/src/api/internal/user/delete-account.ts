import type { AppEnv } from "@cobalt-web/server-data/types";
import {
  deleteAccountResponseSchema,
  deleteUserAccount,
} from "@cobalt-web/server-data/user";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  description:
    "Permanently delete the authenticated user's account and all associated data",
  method: "delete",
  path: "/delete-account",
  responses: {
    200: {
      content: {
        "application/json": { schema: deleteAccountResponseSchema },
      },
      description: "Account deleted",
    },
  },
  summary: "Delete user account",
  tags: ["User"],
});

export const deleteAccountRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const result = await deleteUserAccount(c.var.user.id);
    return c.json(result, 200);
  }
);
