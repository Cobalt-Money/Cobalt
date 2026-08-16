import { Effect } from "effect";
import { BridgeAuthenticationError } from "../domain/errors.js";

export const authorizeBridgeRequest = (
  secret: string | undefined,
  authorization: string | undefined,
): Effect.Effect<void, BridgeAuthenticationError> => {
  if (!secret) {
    return Effect.fail(new BridgeAuthenticationError({ reason: "secret-not-configured" }));
  }
  if (!authorization?.startsWith("Bearer ")) {
    return Effect.fail(new BridgeAuthenticationError({ reason: "missing-token" }));
  }
  const token = authorization.slice("Bearer ".length);
  return token === secret
    ? Effect.void
    : Effect.fail(new BridgeAuthenticationError({ reason: "invalid-token" }));
};

export {
  BridgeErrorSchema,
  BridgeRequestSchema,
  BridgeResponseSchema,
  BridgeStreamMessageSchema,
  type BridgeError,
  type BridgeRequest,
  type BridgeResponse,
  type BridgeStreamMessage,
} from "../domain/schemas.js";
