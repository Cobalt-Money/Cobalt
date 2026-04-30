import { env } from "@cobalt-web/env/server";
import { jwtVerify, SignJWT } from "jose";

const ISSUER = "cobalt-mcp";
const AUDIENCE = "cobalt-agent-bridge";

let cachedKey: Uint8Array | null = null;
function key(): Uint8Array {
  if (!cachedKey) {
    cachedKey = new TextEncoder().encode(env.AGENT_BRIDGE_SECRET);
  }
  return cachedKey;
}

export interface BridgeJwtPayload {
  userId: string;
  sandboxId: string;
}

/** Mint a short-lived bridge token bound to a single sandbox + user. */
export function signBridgeToken(
  payload: BridgeJwtPayload,
  ttlSeconds = 300
): Promise<string> {
  return new SignJWT({ sandboxId: payload.sandboxId, sub: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${String(ttlSeconds)}s`)
    .sign(key());
}

export async function verifyBridgeToken(
  token: string
): Promise<BridgeJwtPayload> {
  const { payload } = await jwtVerify(token, key(), {
    audience: AUDIENCE,
    issuer: ISSUER,
  });
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("bridge token missing sub");
  }
  if (typeof payload.sandboxId !== "string") {
    throw new TypeError("bridge token missing sandboxId");
  }
  return { sandboxId: payload.sandboxId, userId: payload.sub };
}
