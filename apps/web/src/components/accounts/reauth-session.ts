/**
 * Reauth session handed back by Plaid link-token/update and SnapTrade portal
 * generation. Held in a `useRef` across the reconnect → onboarding-host
 * resolve handshake so a stale session can't resolve a later flow.
 */
export interface ReauthSession {
  hookToken: string;
  runId: string;
  linkToken: string;
}
