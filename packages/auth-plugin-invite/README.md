# @cobalt-web/auth-plugin-invite

Decoupled invite primitive for Better Auth.

## What this plugin owns

- Token generation (URL-safe random, 192 bits of entropy)
- Schema declaration for `social_invite` + `social_invite_redemption`
- Routes: `/invite/create`, `/invite/activate`, `/invite/revoke`, `/invite/list`, `/invite/pending`
- Signed-cookie pending-token stash for post-signup redemption
- Post-signup lifecycle hook scanning for matching `target_email`
- Token validation: expiry, max_uses, revoked, target gating, dedupe
- Audit ledger writes
- Typed client SDK + OpenAPI metadata

## What this plugin does NOT own

- Friend graph CRUD
- Role / org membership writes
- Email delivery (callback only — bring your own ESP)
- Any domain-specific tables beyond `social_invite` + `social_invite_redemption`

## Usage

```ts
import { betterAuth } from "better-auth";
import { invite } from "@cobalt-web/auth-plugin-invite";

export const auth = betterAuth({
  plugins: [
    invite({
      inviteUrlBase: "https://friends.cobaltpf.com/invite",
      onAccept: async ({ invite, redeemerUserId, ctx }) => {
        switch (invite.kind) {
          case "friendship":
            await createFriendship(invite.inviterUserId, redeemerUserId);
            break;
          case "family":
            await joinFamily(invite.organizationId!, redeemerUserId);
            break;
        }
      },
      sendInvite: async ({ invite, inviteUrl, inviterName }) => {
        await resend.emails.send({
          from: "Cobalt <invites@cobaltpf.com>",
          to: invite.targetEmail!,
          subject: `${inviterName} invited you`,
          react: <InviteEmail url={inviteUrl} inviterName={inviterName} />,
        });
      },
    }),
  ],
});
```

## Side effects beyond Cobalt — use cases

| App                           | What `onAccept` does                          |
| ----------------------------- | --------------------------------------------- |
| Personal finance social       | insert friendship row                         |
| Couples / family banking      | join household org via Better Auth Org plugin |
| Expense splitting (Splitwise) | add user to expense group                     |
| Dating app                    | create match row                              |
| Discord / community           | grant channel membership                      |
| Multi-tenant SaaS             | grant project collaborator role               |
| Healthcare                    | grant provider read access to patient records |
| Referral programs             | credit both inviter and invitee               |

Plugin is unaware of any of these. `onAccept` is the bridge.

## Schema

The plugin declares two models in Better Auth DSL — your Drizzle (or other ORM) schema must mirror the column names. See `packages/db/src/schema/social/invite.ts` for the Cobalt Drizzle mirror.

| Model                    | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `socialInvite`           | invite metadata + state (token, expiry, max*uses, target*\*) |
| `socialInviteRedemption` | append-only ledger of who-redeemed-what                      |

## Error codes

| Code                       | Cause                                         |
| -------------------------- | --------------------------------------------- |
| `INVITE_NOT_FOUND`         | token doesn't exist                           |
| `INVITE_EXPIRED`           | `expires_at < now`                            |
| `INVITE_REVOKED`           | `revoked_at` set                              |
| `INVITE_EXHAUSTED`         | `uses_count >= max_uses`                      |
| `WRONG_RECIPIENT`          | targeted invite + session user mismatch       |
| `ALREADY_REDEEMED`         | unique `(invite_id, redeemer)` violation      |
| `CANNOT_REDEEM_OWN_INVITE` | inviter tried to redeem their own             |
| `NOT_INVITE_OWNER`         | non-creator tried to revoke                   |
| `ON_ACCEPT_FAILED`         | consumer callback threw — invite was consumed |

## Testing

```sh
bun --filter=@cobalt-web/auth-plugin-invite test
```

Test patterns mirror Better Auth's own plugin tests + `better-invite/better-invite`.
