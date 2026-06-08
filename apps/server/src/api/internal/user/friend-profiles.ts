import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { getFriendProfiles } from "@cobalt-web/server-data/user";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const responseSchema = z.object({
  profiles: z.array(
    z.object({
      displayUsername: z.string().nullable(),
      id: z.string(),
      image: z.string().nullable(),
      name: z.string().nullable(),
    }),
  ),
});

const route = createRoute({
  description:
    "Bulk lookup of public profile fields (name, image, displayUsername) for a list of user ids. Caller is expected to scope the id list to people they have a friend relationship with — this endpoint trusts the caller and does not enforce the friendship edge server-side; that gate lives in the consumer's `friendships` query.",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/friendProfiles",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({ ids: z.array(z.string()).min(1).max(200) }),
        },
      },
    },
  },
  responses: {
    200: jsonContent(responseSchema, "Profile rows for the requested ids"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "Lookup friend display profiles",
  tags: ["User"],
});

export const friendProfilesRouter = createApp().openapi(route, async (c) => {
  const { ids } = c.req.valid("json");
  const profiles = await getFriendProfiles(ids);
  return c.json({ profiles }, 200);
});
