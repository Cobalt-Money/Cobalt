import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import { db } from "@cobalt-web/db";
import { snaptradeUser } from "@cobalt-web/db/schema/providers/snaptrade/user";
import type { AuthenticationApiLoginSnapTradeUserRequest } from "snaptrade-typescript-sdk";

import { ApiError } from "../../../_shared/api-error.js";
import { getBrokerageUserByUserId } from "./queries.js";

interface SnapTradeCredentials {
  providerUserId: string;
  providerUserSecret: string;
}

async function registerSnapTradeUser(userId: string): Promise<SnapTradeCredentials> {
  let response;
  try {
    response = await snaptradeClient.authentication.registerSnapTradeUser({ userId });
  } catch (error) {
    throw new ApiError(
      502,
      "snaptrade_upstream_failed",
      error instanceof Error ? error.message : "SnapTrade registration failed",
    );
  }

  const responseData = response.data || response;
  if (!responseData?.userSecret || !responseData?.userId) {
    throw new ApiError(
      502,
      "snaptrade_upstream_failed",
      "Failed to get userSecret or userId from SnapTrade registration",
    );
  }

  await db.insert(snaptradeUser).values({
    snaptradeUserId: responseData.userId,
    snaptradeUserSecret: responseData.userSecret,
    userId,
  });

  return {
    providerUserId: responseData.userId,
    providerUserSecret: responseData.userSecret,
  };
}

interface ConnectionPortalResult {
  redirectURI: string;
  sessionId: string | undefined;
}

export async function generateConnectionPortal(
  userId: string,
  broker: string,
  reconnectAuthorizationId?: string,
): Promise<ConnectionPortalResult> {
  const existingUser = await getBrokerageUserByUserId(userId);
  const userSession = existingUser ?? (await registerSnapTradeUser(userId));

  const loginParams: AuthenticationApiLoginSnapTradeUserRequest = {
    broker,
    immediateRedirect: true,
    reconnect: reconnectAuthorizationId,
    userId: userSession.providerUserId,
    userSecret: userSession.providerUserSecret,
  };

  let response;
  try {
    response = await snaptradeClient.authentication.loginSnapTradeUser(loginParams);
  } catch (error) {
    throw new ApiError(
      502,
      "snaptrade_upstream_failed",
      error instanceof Error ? error.message : "SnapTrade login failed",
    );
  }

  const responseData = (response.data || response) as {
    redirectURI?: string;
    redirect_uri?: string;
    sessionId?: string;
    session_id?: string;
  };

  const redirectURI = responseData.redirectURI || responseData.redirect_uri;
  const sessionId = responseData.sessionId || responseData.session_id;

  if (!redirectURI) {
    throw new ApiError(
      502,
      "snaptrade_upstream_failed",
      "Failed to get redirectURI from SnapTrade connection portal",
    );
  }

  return { redirectURI, sessionId };
}
