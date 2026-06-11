import { env } from "@cobalt-web/env/server";
import { Resend } from "resend";

import type { SendInviteHook } from "@cobalt-web/auth-plugin-invite";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

  const who = escapeHtml(inviterName || "A friend");
  const url = escapeHtml(inviteUrl);
  const subject = `${inviterName || "A friend"} invited you to Cobalt Friends`;

  const html = `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0b0b0c;color:#fff;padding:32px;">
  <div style="max-width:480px;margin:0 auto;background:#141416;border-radius:16px;padding:32px;">
    <h1 style="font-size:20px;margin:0 0 12px;">${who} invited you to Cobalt Friends</h1>
    <p style="color:#9ca3af;line-height:1.5;margin:0 0 24px;">Tap the button below to accept the invite and connect on the map.</p>
    <a href="${url}" style="display:inline-block;background:#fff;color:#0b0b0c;font-weight:600;padding:12px 20px;border-radius:10px;text-decoration:none;">Accept invite</a>
    <p style="color:#6b7280;font-size:12px;margin:24px 0 0;word-break:break-all;">Or open: ${url}</p>
  </div>
</body></html>`.trim();

  const text = `${inviterName || "A friend"} invited you to Cobalt Friends.\n\nAccept: ${inviteUrl}`;

  const { error } = await resend.emails.send({
    from: env.RESEND_INVITE_FROM,
    html,
    subject,
    text,
    to: inv.targetEmail,
  });
  if (error) {
    console.error("[invite] resend send failed", { error, inviteId: inv.id });
  }
};
