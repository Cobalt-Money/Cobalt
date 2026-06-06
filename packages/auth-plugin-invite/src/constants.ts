/**
 * Cookie key that stashes a pending invite token across signup/login flow.
 * Set on `/invite/activate` when the recipient is signed-out; read by the
 * post-signup hook to auto-redeem after a fresh session is minted.
 */
export const INVITE_COOKIE_NAME = "invite_token";

/**
 * Default invite lifetime (7 days). Long enough for "I'll get to it later"
 * SMS / email flows, short enough that leaked URLs decay.
 */
export const DEFAULT_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

/**
 * Default max uses for an open share-link invite. Targeted invites
 * (`targetUserId` or `targetEmail` set) default to 1 regardless.
 */
export const DEFAULT_MAX_USES_OPEN = 10;
export const DEFAULT_MAX_USES_TARGETED = 1;

/**
 * Cookie TTL — recipient signs in within this window for auto-redeem to fire.
 * 30 min covers the slow signup path (Google OAuth, age gate, etc).
 */
export const DEFAULT_COOKIE_MAX_AGE_SECONDS = 30 * 60;

/**
 * Token character set + length. 32 bytes of url-safe randomness gives
 * 192 bits of entropy — well above what any brute-force guess could touch.
 */
export const TOKEN_LENGTH = 32;
/** Better Auth's generateRandomString accepts these range tokens. */
export const TOKEN_ALPHABET_LOWER = "a-z" as const;
export const TOKEN_ALPHABET_DIGITS = "0-9" as const;

/** Plugin id surfaced to Better Auth + telemetry. */
export const PLUGIN_ID = "invite";
