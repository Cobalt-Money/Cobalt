export interface WorkspaceScope {
  readonly userId: string;
  readonly workspaceId: string;
}

const encoder = new TextEncoder();
const MAX_SIGNATURE_AGE_MS = 5 * 60_000;

const toHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const encodeBase64Url = (value: string): string => {
  let binary = "";
  for (const byte of encoder.encode(value)) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

export const deriveSandboxId = async (scope: WorkspaceScope): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${scope.userId}\0${scope.workspaceId}`),
  );
  return `ws-${toHex(digest)}`;
};

export const deriveStoragePrefixes = (
  scope: WorkspaceScope,
): { readonly outputs: string; readonly uploads: string } => {
  const root = `/users/${encodeBase64Url(scope.userId)}/workspaces/${scope.workspaceId}`;
  return {
    outputs: `${root}/outputs/`,
    uploads: `${root}/uploads/`,
  };
};

export const signRequest = async (
  secret: string,
  method: string,
  pathname: string,
  timestamp: string,
  body: string,
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const message = `${timestamp}\n${method.toUpperCase()}\n${pathname}\n${body}`;
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
};

interface VerifySignedRequestOptions {
  readonly body: string;
  readonly headers: Headers;
  readonly method: string;
  readonly now?: number;
  readonly pathname: string;
  readonly secret?: string;
}

const isEqualSignature = (received: string, expected: string): boolean => {
  if (!/^[a-f0-9]{64}$/u.test(received) || received.length !== expected.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference += Math.abs((received.codePointAt(index) ?? 0) - (expected.codePointAt(index) ?? 0));
  }
  return difference === 0;
};

export const verifySignedRequest = async ({
  body,
  headers,
  method,
  now = Date.now(),
  pathname,
  secret,
}: VerifySignedRequestOptions): Promise<boolean> => {
  if (!secret) {
    return false;
  }
  const timestamp = headers.get("x-cobalt-timestamp");
  const received = headers.get("x-cobalt-signature");
  if (!timestamp || !received || !/^\d{13}$/u.test(timestamp)) {
    return false;
  }
  const requestTime = Number(timestamp);
  if (!Number.isSafeInteger(requestTime) || Math.abs(now - requestTime) > MAX_SIGNATURE_AGE_MS) {
    return false;
  }
  const expected = await signRequest(secret, method, pathname, timestamp, body);
  return isEqualSignature(received, expected);
};
