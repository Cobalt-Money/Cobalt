import type { GenericEndpointContext } from "better-auth";
import type { InferOptionSchema } from "better-auth/types";

import type { schema as inviteSchema } from "./schema";

/**
 * Persisted invite row. Mirrors the Drizzle schema in
 * `@cobalt-web/db/schema/social/invite`. Plugin receives this from the adapter
 * and forwards relevant fields to the consumer's `onAccept` callback.
 */
export interface InviteRecord {
  id: string;
  inviterUserId: string;
  /**
   * Opaque discriminator passed through verbatim. Plugin doesn't interpret —
   * consumer's `onAccept` branches on it.
   */
  kind: string;
  /** For org-shaped redemptions (consumer reads, plugin ignores). */
  organizationId: string | null;
  role: string | null;
  targetUserId: string | null;
  targetEmail: string | null;
  targetPhone: string | null;
  token: string;
  maxUses: number;
  usesCount: number;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Side-effect contract. Plugin calls this AFTER token validation,
 * ledger insert, and uses_count increment all succeed. If this throws the
 * plugin returns `ON_ACCEPT_FAILED` — ledger writes are NOT rolled back
 * (the invite has been consumed; recover state via the consumer's audit).
 */
export type OnAcceptCallback = (params: {
  invite: InviteRecord;
  redeemerUserId: string;
  ctx: GenericEndpointContext;
}) => Promise<void>;

/**
 * Hook fired when the inviter creates a new invite. Use to send the URL via
 * email/SMS/push. Plugin doesn't gate on the result — failure to deliver
 * doesn't invalidate the invite.
 */
export type SendInviteHook = (params: {
  invite: InviteRecord;
  inviterName: string;
  inviterEmail: string | null;
  inviteUrl: string;
}) => Promise<void>;

/**
 * Hook fired when an invite is revoked. Use to clean up any external state
 * (e.g. cancel a pending email send).
 */
export type OnRevokeCallback = (params: {
  invite: InviteRecord;
  ctx: GenericEndpointContext;
}) => Promise<void>;

/**
 * Hook fired when a recipient declines an invite. Recipient-side suppression
 * only — the invite remains valid for other potential redeemers. Use to
 * notify the inviter, emit analytics, etc.
 */
export type OnDeclineCallback = (params: {
  invite: InviteRecord;
  declinerUserId: string;
  ctx: GenericEndpointContext;
}) => Promise<void>;

export interface InviteOptions {
  /**
   * Side effect to apply once an invite is successfully redeemed.
   * Required — the plugin has no opinion on what redemption means.
   */
  onAccept: OnAcceptCallback;

  /**
   * Optional revoke hook for external cleanup.
   */
  onRevoke?: OnRevokeCallback;

  /**
   * Optional decline hook. Fired after the decline row is recorded.
   */
  onDecline?: OnDeclineCallback;

  /**
   * Optional delivery hook. Plugin does not send emails itself.
   * Consumer wires Resend / SendGrid / Twilio / etc.
   */
  sendInvite?: SendInviteHook;

  /**
   * Base URL for redeemable invite links. Used to build the `url` returned
   * to the inviter and passed to `sendInvite`.
   * Example: `"https://friends.cobaltpf.com/invite"` → URL becomes
   * `"https://friends.cobaltpf.com/invite/{token}"`.
   */
  inviteUrlBase: string;

  /**
   * Default invite expiry in seconds. Per-invite override via `expiresInSeconds`
   * on the create endpoint. Default: 7 days.
   */
  defaultExpirySeconds?: number;

  /**
   * Default max_uses for open (untargeted) invites. Targeted invites always
   * default to 1. Override per-create via `maxUses`. Default: 10.
   */
  defaultMaxUsesOpen?: number;

  /**
   * Cookie TTL for the pending invite cookie set during /activate when
   * the recipient isn't signed in yet. Default: 30 min.
   */
  cookieMaxAgeSeconds?: number;

  /**
   * Optional allowlist of valid `kind` strings. If set, the create route
   * rejects invites with `kind` outside this set. Defaults to no restriction.
   *
   * Example: `["friendship", "family", "team"]`.
   */
  allowedKinds?: readonly string[];

  /**
   * Better Auth column-rename overrides. Mirrors the convention used by core
   * plugins (organization, anonymous): consumers can map plugin field names
   * to their own column conventions without touching plugin internals.
   */
  schema?: InferOptionSchema<typeof inviteSchema>;
}

/** Options after defaults are applied. Internal. */
export interface ResolvedInviteOptions extends Required<
  Omit<InviteOptions, "onDecline" | "onRevoke" | "sendInvite" | "allowedKinds" | "schema">
> {
  allowedKinds: readonly string[] | undefined;
  onDecline: OnDeclineCallback | undefined;
  onRevoke: OnRevokeCallback | undefined;
  schema: InferOptionSchema<typeof inviteSchema> | undefined;
  sendInvite: SendInviteHook | undefined;
}
