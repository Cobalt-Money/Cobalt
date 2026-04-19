import { auth } from "@cobalt-web/auth";
import type { AppEnv } from "@cobalt-web/server-data/types";
import {
  deleteAccountResponseSchema,
  deleteUserAccount,
} from "@cobalt-web/server-data/user";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const route = createRoute({
  description:
    "Permanently delete the authenticated user's account and all associated data",
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/deleteAccount",
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

    // Invalidate the session server-side. Done after the row delete (which
    // cascade-removes the session anyway) so the response carries a Set-Cookie
    // that clears the client cookie on this request.
    try {
      await auth.api.signOut({ headers: c.req.raw.headers });
    } catch (error) {
      console.warn("[delete-account] signOut failed", error);
    }

    return c.json(result, 200);
  }
);
