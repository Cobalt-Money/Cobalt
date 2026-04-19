import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import { db } from "@cobalt-web/db";
import { brokerageUser } from "@cobalt-web/db/schema/brokerage";
import type { AuthenticationApiLoginSnapTradeUserRequest } from "snaptrade-typescript-sdk";

import { getBrokerageUserByUserId } from "./queries.js";

interface SnapTradeCredentials {
  providerUserId: string;
  providerUserSecret: string;
}

async function registerSnapTradeUser(
  userId: string
): Promise<SnapTradeCredentials> {
  const response = await snaptradeClient.authentication.registerSnapTradeUser({
    userId,
  });

  const responseData = response.data || response;
  if (!responseData?.userSecret || !responseData?.userId) {
    throw new Error(
      "Failed to get userSecret or userId from SnapTrade registration"
    );
  }

  await db.insert(brokerageUser).values({
    providerUserId: responseData.userId,
    providerUserSecret: responseData.userSecret,
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
  reconnectAuthorizationId?: string
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

  const response =
    await snaptradeClient.authentication.loginSnapTradeUser(loginParams);

  const responseData = (response.data || response) as {
    redirectURI?: string;
    redirect_uri?: string;
    sessionId?: string;
    session_id?: string;
  };

  const redirectURI = responseData.redirectURI || responseData.redirect_uri;
  const sessionId = responseData.sessionId || responseData.session_id;

  if (!redirectURI) {
    throw new Error(
      "Failed to get redirectURI from SnapTrade connection portal"
    );
  }

  return { redirectURI, sessionId };
}
