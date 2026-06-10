import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import * as z from "zod";

import { getInviteAdapter } from "../adapter";
import { INVITE_ERROR_CODES } from "../error-codes";
import type { ResolvedInviteOptions } from "../types";
import { normalizeEmail } from "../utils";

const bodySchema = z.object({
  inviteId: z.string().optional(),
  token: z.string().optional(),
});

/**
 * Recipient-side suppression. Records a decline row for (invite, caller) so
 * the invite stops appearing in the caller's `/invite/pending` list. Does
 * NOT revoke the invite — other recipients (open links, broader targets)
 * can still redeem.
 *
 * Idempotent: a second decline returns `{ declined: true, firstTime: false }`.
 * Caller may pass `inviteId` (from pending list) OR `token` (from share URL).
 */
export const declineInviteRoute = (options: ResolvedInviteOptions) =>
  createAuthEndpoint(
    "/invite/decline",
    {
      body: bodySchema,
      metadata: {
        openapi: { description: "Decline an invite (recipient-side suppression)" },
      },
      method: "POST",
      use: [sessionMiddleware],
    },
    async (ctx) => {
      const { inviteId, token } = ctx.body;
      if (!inviteId && !token) {
        throw new APIError("BAD_REQUEST", {
          message: "Either inviteId or token is required",
        });
      }

      const adapter = getInviteAdapter(ctx);
      const invite = inviteId
        ? await adapter.findInviteById(inviteId)
        : await adapter.findInviteByToken(token as string);
      if (!invite) {
        throw APIError.from("NOT_FOUND", INVITE_ERROR_CODES.INVITE_NOT_FOUND);
      }

      const sessionUser = ctx.context.session.user as {
        id: string;
        email?: string | null;
      };

      if (invite.inviterUserId === sessionUser.id) {
        throw APIError.from("BAD_REQUEST", INVITE_ERROR_CODES.CANNOT_DECLINE_OWN_INVITE);
      }
      if (invite.targetUserId && invite.targetUserId !== sessionUser.id) {
        throw APIError.from("FORBIDDEN", INVITE_ERROR_CODES.WRONG_RECIPIENT);
      }
      if (invite.targetEmail && normalizeEmail(sessionUser.email) !== invite.targetEmail) {
        throw APIError.from("FORBIDDEN", INVITE_ERROR_CODES.WRONG_RECIPIENT);
      }

      const existing = await adapter.findDecline(invite.id, sessionUser.id);
      if (existing) {
        return ctx.json({ declined: true, firstTime: false, inviteId: invite.id });
      }

      await adapter.createDecline({
        declinedAt: new Date(),
        declinedByUserId: sessionUser.id,
        inviteId: invite.id,
      });

      if (options.onDecline) {
        try {
          await options.onDecline({
            ctx,
            declinerUserId: sessionUser.id,
            invite,
          });
        } catch (error) {
          ctx.context.logger.warn("[invite] onDecline threw", {
            error,
            inviteId: invite.id,
          });
        }
      }

      return ctx.json({ declined: true, firstTime: true, inviteId: invite.id });
    },
  );
