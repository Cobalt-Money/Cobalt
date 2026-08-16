export const hasValidBearerToken = async (
  headers: Headers,
  expectedToken?: string,
): Promise<boolean> => {
  if (!expectedToken) {
    return false;
  }

  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const encoder = new TextEncoder();
  const [receivedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(authorization.slice(7))),
    crypto.subtle.digest("SHA-256", encoder.encode(expectedToken)),
  ]);
  const received = new Uint8Array(receivedDigest);
  const expected = new Uint8Array(expectedDigest);
  const difference = received.reduce(
    (total, byte, index) => total + Math.abs(byte - expected[index]),
    0,
  );

  return difference === 0;
};
