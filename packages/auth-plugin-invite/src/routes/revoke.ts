import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import * as z from "zod";

import { getInviteAdapter } from "../adapter";
import { INVITE_ERROR_CODES } from "../error-codes";
import type { ResolvedInviteOptions } from "../types";

export const revokeInviteRoute = (options: ResolvedInviteOptions) =>
  createAuthEndpoint(
    "/invite/revoke",
    {
      body: z.object({ inviteId: z.string() }),
      metadata: {
        openapi: { description: "Revoke an invite the caller created" },
      },
      method: "POST",
      use: [sessionMiddleware],
    },
    async (ctx) => {
      const adapter = getInviteAdapter(ctx);
      const invite = await adapter.findInviteById(ctx.body.inviteId);
      if (!invite) {
        throw APIError.from("NOT_FOUND", INVITE_ERROR_CODES.INVITE_NOT_FOUND);
      }
      if (invite.inviterUserId !== ctx.context.session.user.id) {
        throw APIError.from("FORBIDDEN", INVITE_ERROR_CODES.NOT_INVITE_OWNER);
      }
      const now = new Date();
      await adapter.revoke(invite.id, now);
      if (options.onRevoke) {
        try {
          await options.onRevoke({ ctx, invite });
        } catch (error) {
          ctx.context.logger.warn("[invite] onRevoke threw", {
            error,
            inviteId: invite.id,
          });
        }
      }
      return ctx.json({ inviteId: invite.id, revoked: true });
    },
  );
