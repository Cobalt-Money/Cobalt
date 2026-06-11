import { renderInviteEmail } from "@cobalt-web/emails/invite-email";
import { env } from "@cobalt-web/env/server";
import { Resend } from "resend";

import type { SendInviteHook } from "@cobalt-web/auth-plugin-invite";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const sendInviteEmail: SendInviteHook = async ({ invite: inv, inviterName, inviteUrl }) => {
  if (!resend) {
    console.warn("[invite] RESEND_API_KEY unset — skipping email delivery", {
      inviteId: inv.id,
      targetEmail: inv.targetEmail,
    });
    return;
  }
  if (!inv.targetEmail) {
    return;
  }

  const { html, text } = await renderInviteEmail({
    inviteUrl,
    inviterName: inviterName ?? "",
  });

  const { error } = await resend.emails.send({
    from: env.RESEND_INVITE_FROM,
    html,
    subject: `${inviterName || "A friend"} invited you to Cobalt Friends`,
    text,
    to: inv.targetEmail,
  });
  if (error) {
    console.error("[invite] resend send failed", { error, inviteId: inv.id });
  }
};
