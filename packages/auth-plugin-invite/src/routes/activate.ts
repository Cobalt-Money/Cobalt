import { APIError, createAuthEndpoint, getSessionFromCtx } from "better-auth/api";
import * as z from "zod";

import { getInviteAdapter } from "../adapter";
import { INVITE_COOKIE_NAME } from "../constants";
import { INVITE_ERROR_CODES } from "../error-codes";
import type { ResolvedInviteOptions } from "../types";
import { normalizeEmail } from "../utils";

const bodySchema = z.object({
  /** Where the SPA wants to land after a sign-in detour. Plugin echoes it back. */
  callbackURL: z.string().optional(),
  token: z.string().min(1),
});

/**
 * Two modes:
 *   - Signed-in caller → validate token, write redemption row, call onAccept,
 *     return `{ accepted: true, invite }`.
 *   - Signed-out caller → stash token in a signed cookie, return
 *     `{ accepted: false, requiresAuth: true, callbackURL }`. The SPA then
 *     redirects to sign-in. After signup/signin, the post-signup hook reads
 *     the cookie and finishes the redemption.
 */
export const activateInviteRoute = (options: ResolvedInviteOptions) =>
  createAuthEndpoint(
    "/invite/activate",
    {
      body: bodySchema,
      metadata: {
        openapi: {
          description: "Activate an invite (cookie stash or immediate accept)",
        },
      },
      method: "POST",
    },
    async (ctx) => {
      const { token, callbackURL } = ctx.body;
      const adapter = getInviteAdapter(ctx);

      const invite = await adapter.findInviteByToken(token);
      if (!invite) {
        throw APIError.from("BAD_REQUEST", INVITE_ERROR_CODES.INVITE_NOT_FOUND);
      }
      const now = new Date();
      if (new Date(invite.expiresAt).getTime() < now.getTime()) {
        throw APIError.from("BAD_REQUEST", INVITE_ERROR_CODES.INVITE_EXPIRED);
      }
      if (invite.revokedAt !== null) {
        throw APIError.from("BAD_REQUEST", INVITE_ERROR_CODES.INVITE_REVOKED);
      }
      if (invite.usesCount >= invite.maxUses) {
        throw APIError.from("BAD_REQUEST", INVITE_ERROR_CODES.INVITE_EXHAUSTED);
      }

      const session = await getSessionFromCtx(ctx, { disableRefresh: true });
      const sessionUser = session?.user as { id: string; email?: string | null } | undefined;

      // Signed-out path — stash token, return.
      if (!sessionUser) {
        const cookie = ctx.context.createAuthCookie(INVITE_COOKIE_NAME, {
          maxAge: options.cookieMaxAgeSeconds,
        });
        await ctx.setSignedCookie(cookie.name, token, ctx.context.secret, {
          ...cookie.attributes,
        });
        return ctx.json({
          accepted: false,
          callbackURL: callbackURL ?? "/",
          requiresAuth: true,
        });
      }

      // Signed-in path — validate target + redeem.
      if (invite.inviterUserId === sessionUser.id) {
        throw APIError.from("BAD_REQUEST", INVITE_ERROR_CODES.CANNOT_REDEEM_OWN_INVITE);
      }
      if (invite.targetUserId && invite.targetUserId !== sessionUser.id) {
        throw APIError.from("FORBIDDEN", INVITE_ERROR_CODES.WRONG_RECIPIENT);
      }
      if (invite.targetEmail && normalizeEmail(sessionUser.email) !== invite.targetEmail) {
        throw APIError.from("FORBIDDEN", INVITE_ERROR_CODES.WRONG_RECIPIENT);
      }

      const inviter = await ctx.context.adapter.findOne<{
        id: string;
        name?: string | null;
        email?: string | null;
      }>({
        model: "user",
        where: [{ field: "id", value: invite.inviterUserId }],
      });
      const inviterName = inviter?.name ?? inviter?.email ?? null;

      // Idempotent: the post-signup hook (hooks.ts) may have already auto-
      // redeemed in the same session via the stashed cookie. Treat a repeat
      // call as success so the SPA renders the success toast instead of an
      // error. Redemption rows minted in the last 60s are still "first time"
      // for UX purposes — they were the just-completed OAuth bounce.
      const existing = await adapter.findRedemption(invite.id, sessionUser.id);
      if (existing) {
        const firstTime =
          existing.redeemedAt != null &&
          now.getTime() - new Date(existing.redeemedAt).getTime() < 60_000;
        return ctx.json({ accepted: true, firstTime, invite, inviterName });
      }

      await adapter.createRedemption({
        inviteId: invite.id,
        redeemedAt: now,
        redeemerUserId: sessionUser.id,
      });
      await adapter.incrementUses(invite.id, invite.usesCount);

      try {
        await options.onAccept({
          ctx,
          invite,
          redeemerUserId: sessionUser.id,
        });
      } catch (error) {
        ctx.context.logger.error("[invite] onAccept failed", {
          error,
          inviteId: invite.id,
          redeemerUserId: sessionUser.id,
        });
        throw APIError.from("INTERNAL_SERVER_ERROR", INVITE_ERROR_CODES.ON_ACCEPT_FAILED);
      }

      return ctx.json({ accepted: true, firstTime: true, invite, inviterName });
    },
  );
