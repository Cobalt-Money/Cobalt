import { auth } from "@cobalt-web/auth";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { deleteAccountResponseSchema, deleteUserAccount } from "@cobalt-web/server-data/user";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  description: "Permanently delete the authenticated user's account and all associated data",
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/deleteAccount",
  responses: {
    200: jsonContent(deleteAccountResponseSchema, "Account deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    500: jsonContent(errorResponseWithCodeSchema, "Account deletion failed"),
  },
  summary: "Delete user account",
  tags: ["User"],
});

export const deleteAccountRouter = createApp().openapi(route, async (c) => {
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
});
