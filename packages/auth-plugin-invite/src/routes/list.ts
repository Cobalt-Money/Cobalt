import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";

import { getInviteAdapter } from "../adapter";

export const listInvitesRoute = () =>
  createAuthEndpoint(
    "/invite/list",
    {
      metadata: {
        openapi: { description: "List invites the caller created" },
      },
      method: "GET",
      use: [sessionMiddleware],
    },
    async (ctx) => {
      const adapter = getInviteAdapter(ctx);
      const invites = await adapter.listSent(ctx.context.session.user.id);
      return ctx.json({ invites });
    },
  );
