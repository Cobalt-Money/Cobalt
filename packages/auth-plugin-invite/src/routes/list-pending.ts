import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";

import { getInviteAdapter } from "../adapter";
import { normalizeEmail } from "../utils";

export const listPendingInvitesRoute = () =>
  createAuthEndpoint(
    "/invite/pending",
    {
      metadata: {
        openapi: { description: "List invites targeted at the caller" },
      },
      method: "GET",
      use: [sessionMiddleware],
    },
    async (ctx) => {
      const adapter = getInviteAdapter(ctx);
      const user = ctx.context.session.user as {
        id: string;
        email?: string | null;
      };
      const invites = await adapter.listPending(user.id, normalizeEmail(user.email), new Date());
      return ctx.json({ invites });
    },
  );
