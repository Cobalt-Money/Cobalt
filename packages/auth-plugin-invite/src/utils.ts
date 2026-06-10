import { generateRandomString } from "better-auth/crypto";

import {
  DEFAULT_COOKIE_MAX_AGE_SECONDS,
  DEFAULT_EXPIRY_SECONDS,
  DEFAULT_MAX_USES_OPEN,
  TOKEN_ALPHABET_DIGITS,
  TOKEN_ALPHABET_LOWER,
  TOKEN_LENGTH,
} from "./constants";
import type { InviteOptions, ResolvedInviteOptions } from "./types";

export function resolveOptions(opts: InviteOptions): ResolvedInviteOptions {
  return {
    allowedKinds: opts.allowedKinds,
    cookieMaxAgeSeconds: opts.cookieMaxAgeSeconds ?? DEFAULT_COOKIE_MAX_AGE_SECONDS,
    defaultExpirySeconds: opts.defaultExpirySeconds ?? DEFAULT_EXPIRY_SECONDS,
    defaultMaxUsesOpen: opts.defaultMaxUsesOpen ?? DEFAULT_MAX_USES_OPEN,
    inviteUrlBase: opts.inviteUrlBase.replace(/\/$/, ""),
    onAccept: opts.onAccept,
    onDecline: opts.onDecline,
    onRevoke: opts.onRevoke,
    schema: opts.schema,
    sendInvite: opts.sendInvite,
  };
}

export function generateInviteToken(): string {
  return generateRandomString(TOKEN_LENGTH, TOKEN_ALPHABET_LOWER, TOKEN_ALPHABET_DIGITS);
}

export function buildInviteUrl(base: string, token: string): string {
  return `${base}/${token}`;
}

export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  return input.trim().toLowerCase();
}

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}
