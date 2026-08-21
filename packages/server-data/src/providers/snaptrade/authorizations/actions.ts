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

function requireDisabledState(authorization: BrokerageAuthorization): BrokerageAuthorizationState {
  if (typeof authorization.disabled !== "boolean") {
    throw new TypeError(`SnapTrade authorization ${authorization.id} has no disabled state`);
  }

  return authorization as BrokerageAuthorizationState;
}

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

  return requireDisabledState(response.data);
}

/** Fetch the provider-owned state for all of a user's brokerage authorizations. */
export async function listBrokerageAuthorizations(
  creds: AuthorizationUserCreds,
): Promise<BrokerageAuthorizationState[]> {
  const response = await snaptradeClient.connections.listBrokerageAuthorizations({
    userId: creds.providerUserId,
    userSecret: creds.userSecret,
  });

  return response.data.map(requireDisabledState);
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
