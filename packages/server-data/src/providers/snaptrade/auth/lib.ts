/**
 * Normalize the SnapTrade SDK's connection portal response, which inconsistently
 * returns either camelCase (`redirectURI`, `sessionId`) or snake_case
 * (`redirect_uri`, `session_id`) depending on SDK version. Returns the camelCase
 * shape we expose on the wire.
 */
export function toConnectionPortal(raw: unknown): {
  redirectURI: string | undefined;
  sessionId: string | undefined;
} {
  const data = (raw ?? {}) as {
    redirectURI?: string;
    redirect_uri?: string;
    sessionId?: string;
    session_id?: string;
  };
  return {
    redirectURI: data.redirectURI ?? data.redirect_uri,
    sessionId: data.sessionId ?? data.session_id,
  };
}
