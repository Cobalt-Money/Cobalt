import type { HookEndpointContext } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";

import { getInviteAdapter } from "./adapter";
import { INVITE_COOKIE_NAME } from "./constants";
import type { ResolvedInviteOptions } from "./types";
import { normalizeEmail } from "./utils";

/**
 * Lifecycle hook fired after auth events that mint or rotate a session
 * (signup, signin via any method, OAuth callback). Reads the pending invite
 * cookie set during `/invite/activate`, validates the invite against the
 * fresh session, and finishes redemption.
 *
 * Wrapped in try/catch so a stale cookie or bad invite never blocks login.
 */
export const inviteHooks = (options: ResolvedInviteOptions) => ({
  after: [
    {
      handler: createAuthMiddleware(async (ctx) => {
        const session = ctx.context.newSession;
        if (!session?.user) {
          return;
        }
        const user = session.user as { id: string; email?: string | null };

        const cookie = ctx.context.createAuthCookie(INVITE_COOKIE_NAME, {
          maxAge: options.cookieMaxAgeSeconds,
        });
        const token = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
        if (!token) {
          return;
        }

        // Clear the cookie now so a failure doesn't keep retrying forever.
        ctx.setCookie(cookie.name, "", { ...cookie.attributes, maxAge: 0 });

        const adapter = getInviteAdapter(ctx);
        const invite = await adapter.findInviteByToken(token);
        if (!invite) {
          return;
        }

        const now = new Date();
        if (
          invite.revokedAt !== null ||
          new Date(invite.expiresAt).getTime() < now.getTime() ||
          invite.usesCount >= invite.maxUses
        ) {
          return;
        }
        if (invite.inviterUserId === user.id) {
          return;
        }
        if (invite.targetUserId && invite.targetUserId !== user.id) {
          return;
        }
        if (invite.targetEmail && normalizeEmail(user.email) !== invite.targetEmail) {
          return;
        }

        const existing = await adapter.findRedemption(invite.id, user.id);
        if (existing) {
          return;
        }

        try {
          await adapter.createRedemption({
            inviteId: invite.id,
            redeemedAt: now,
            redeemerUserId: user.id,
          });
          await adapter.incrementUses(invite.id, invite.usesCount);
          await options.onAccept({ ctx, invite, redeemerUserId: user.id });
        } catch (error) {
          ctx.context.logger.error("[invite] post-signup auto-redeem failed", {
            error,
            inviteId: invite.id,
            userId: user.id,
          });
        }
      }),
      matcher: (ctx: HookEndpointContext) => {
        const path = ctx.path ?? "";
        return (
          path.startsWith("/sign-in") ||
          path.startsWith("/sign-up") ||
          path.startsWith("/callback") ||
          path.startsWith("/oauth2/callback")
        );
      },
    },
  ],
});
