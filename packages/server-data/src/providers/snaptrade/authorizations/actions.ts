import { snaptradeClient } from "@cobalt-web/clients/snaptrade";
import type { BrokerageAuthorization } from "snaptrade-typescript-sdk";

interface UserCreds {
  providerUserId: string;
  providerUserSecret: string;
}

interface AuthorizationUserCreds {
  providerUserId: string;
  userSecret: string;
}

export type BrokerageAuthorizationState = BrokerageAuthorization & { disabled: boolean };

/** Fetch the current provider-owned state for a single brokerage authorization. */
export async function getBrokerageAuthorization(
  authorizationId: string,
  creds: AuthorizationUserCreds,
): Promise<BrokerageAuthorizationState> {
  const response = await snaptradeClient.connections.detailBrokerageAuthorization({
    authorizationId,
    userId: creds.providerUserId,
    userSecret: creds.userSecret,
  });

  if (typeof response.data.disabled !== "boolean") {
    throw new TypeError(`SnapTrade authorization ${authorizationId} has no disabled state`);
  }

  return response.data as BrokerageAuthorizationState;
}

/** Remove a brokerage authorization on SnapTrade's side. */
export async function removeBrokerageAuthorization(
  authorizationId: string,
  creds: UserCreds,
): Promise<void> {
  await snaptradeClient.connections.removeBrokerageAuthorization({
    authorizationId,
    userId: creds.providerUserId,
    userSecret: creds.providerUserSecret,
  });
}
