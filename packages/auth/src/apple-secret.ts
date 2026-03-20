import { env } from "@cobalt-web/env/server";
import { SignJWT, importPKCS8 } from "jose";

/**
 * Apple Sign In client secret — ES256 JWT from the .p8 key (developer.apple.com).
 * @see https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
 */

let cachedSecret: { expiresAt: number; token: string } | null = null;

export async function getAppleClientSecret(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedSecret && cachedSecret.expiresAt - now > 86_400) {
    return cachedSecret.token;
  }

  const teamId = env.APPLE_TEAM_ID;
  const keyId = env.APPLE_KEY_ID;
  const serviceId = env.APPLE_SERVICE_ID;
  const privateKeyPem = env.APPLE_PRIVATE_KEY;

  const privateKey = await importPKCS8(privateKeyPem, "ES256");
  const expiresAt = now + 180 * 24 * 60 * 60;

  const token = await new SignJWT({})
    .setAudience("https://appleid.apple.com")
    .setIssuer(teamId)
    .setSubject(serviceId)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .sign(privateKey);

  cachedSecret = { expiresAt, token };

  return token;
}
